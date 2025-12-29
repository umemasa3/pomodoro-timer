import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ConsentManager } from '../consent-manager';
import { AccountDeletionService } from '../account-deletion-service';

// モックの設定
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
    rpc: vi.fn(),
  },
}));

// テスト用のジェネレーター
const privacySettingsArb = fc.record({
  dataProcessingConsent: fc.boolean(),
  analyticsConsent: fc.boolean(),
  marketingConsent: fc.boolean(),
  consentDate: fc.date().map(d => d.toISOString()),
  consentVersion: fc.string({ minLength: 1, maxLength: 10 }),
});

const legalDocumentArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(
    'terms' as const,
    'privacy' as const,
    'cookie' as const
  ),
  version: fc.string({ minLength: 1, maxLength: 10 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  content: fc.string({ minLength: 10, maxLength: 1000 }),
  effectiveDate: fc.date().map(d => d.toISOString()),
  isActive: fc.boolean(),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

const userIdArb = fc.uuid();

describe('プライバシー設定のプロパティテスト', () => {
  let consentManager: ConsentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    consentManager = new ConsentManager();
    // dataExportService = new DataExportService();
    // accountDeletionService = new AccountDeletionService();
  });

  /**
   * プロパティ 4: プライバシー設定の遵守
   * すべてのデータ処理において、ユーザーの同意設定に従ってデータが取り扱われ、
   * 同意のないデータ処理は実行されない
   *
   * **検証対象: 要件 11.2, 11.3**
   */
  describe('プロパティ 4: プライバシー設定の遵守', () => {
    it('同意設定の更新は常に正しく反映される', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          privacySettingsArb,
          async (userId, initialSettings) => {
            // モックの設定
            const mockSupabase = await import('../supabase');
            const fromMock = mockSupabase.supabase.from as any;

            // 初期設定の取得をモック
            fromMock.mockReturnValue({
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      user_id: userId,
                      data_processing_consent:
                        initialSettings.dataProcessingConsent,
                      analytics_consent: initialSettings.analyticsConsent,
                      marketing_consent: initialSettings.marketingConsent,
                      consent_date: initialSettings.consentDate,
                      consent_version: initialSettings.consentVersion,
                    },
                    error: null,
                  }),
                })),
              })),
              upsert: vi.fn().mockResolvedValue({ error: null }),
            });

            // 初期設定を取得
            const retrievedSettings =
              await consentManager.getUserPrivacySettings(userId);

            // 設定が正しく取得されることを確認
            expect(retrievedSettings.dataProcessingConsent).toBe(
              initialSettings.dataProcessingConsent
            );
            expect(retrievedSettings.analyticsConsent).toBe(
              initialSettings.analyticsConsent
            );
            expect(retrievedSettings.marketingConsent).toBe(
              initialSettings.marketingConsent
            );

            // 設定を更新
            const updatedAnalyticsConsent = !initialSettings.analyticsConsent;
            await consentManager.updateUserPrivacySettings(userId, {
              analyticsConsent: updatedAnalyticsConsent,
            });

            // upsertが正しいデータで呼ばれることを確認
            expect(fromMock().upsert).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: userId,
                analytics_consent: updatedAnalyticsConsent,
              })
            );
          }
        ),
        { numRuns: 30 }
      );
    });

    it('同意撤回は適切に記録される', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.constantFrom('analytics' as const, 'marketing' as const),
          async (userId, consentType) => {
            // モックの設定
            const mockSupabase = await import('../supabase');
            const fromMock = mockSupabase.supabase.from as any;

            fromMock.mockReturnValue({
              upsert: vi.fn().mockResolvedValue({ error: null }),
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'consent-record-id' },
                    error: null,
                  }),
                })),
              })),
            });

            // 同意を撤回
            await consentManager.revokeConsent(userId, consentType);

            // プライバシー設定が更新されることを確認
            expect(fromMock().upsert).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: userId,
                [`${consentType}_consent`]: false,
              })
            );

            // 撤回記録が作成されることを確認
            expect(fromMock().insert).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: userId,
                documents: [{ type: consentType, version: 'revoked' }],
                method: 'revocation',
              })
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('アカウント削除要求は30日の猶予期間を設ける', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          async (userId, reason) => {
            // モックの設定
            const mockSupabase = await import('../supabase');
            const fromMock = mockSupabase.supabase.from as any;

            const mockDeletionRequest = {
              id: 'deletion-request-id',
              user_id: userId,
              requested_at: new Date().toISOString(),
              scheduled_deletion_at: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              reason: reason || null,
              status: 'pending',
              cancellation_deadline: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            };

            fromMock.mockReturnValue({
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: mockDeletionRequest,
                    error: null,
                  }),
                })),
              })),
            });

            // アカウント削除を要求
            const accountDeletionService = new AccountDeletionService();
            const deletionRequest =
              await accountDeletionService.requestAccountDeletion(
                userId,
                reason
              );

            // 削除要求が正しく作成されることを確認
            expect(deletionRequest.userId).toBe(userId);
            expect(deletionRequest.status).toBe('pending');
            expect(deletionRequest.reason).toBe(reason);

            // 30日後の削除予定日が設定されることを確認
            const requestedDate = new Date(deletionRequest.requestedAt);
            const scheduledDate = new Date(deletionRequest.scheduledDeletionAt);
            const daysDiff = Math.floor(
              (scheduledDate.getTime() - requestedDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            expect(daysDiff).toBe(30);

            // キャンセル期限が削除予定日と同じかそれ以前であることを確認
            const cancellationDeadline = new Date(
              deletionRequest.cancellationDeadline
            );
            expect(cancellationDeadline.getTime()).toBeLessThanOrEqual(
              scheduledDate.getTime()
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('同意が必要な場合の判定が正しく動作する', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(legalDocumentArb, { minLength: 1, maxLength: 3 }),
          async (userId, latestDocuments) => {
            // モックの設定
            const mockSupabase = await import('../supabase');
            const fromMock = mockSupabase.supabase.from as any;

            // 最新の法的文書を返すモック
            fromMock.mockImplementation((tableName: string) => {
              if (tableName === 'legal_documents') {
                return {
                  select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        data: latestDocuments,
                        error: null,
                      })),
                    })),
                  })),
                };
              } else if (tableName === 'consent_records') {
                // 同意記録がない場合
                return {
                  select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(() => ({
                          single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'No rows found' },
                          }),
                        })),
                      })),
                    })),
                  })),
                };
              }
            });

            // 同意が必要かチェック
            const requiresConsent =
              await consentManager.requiresConsent(userId);

            // 同意記録がない場合は同意が必要
            expect(requiresConsent).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * Feature: production-readiness, Property 4: プライバシー設定の遵守
 * すべてのデータ処理において、ユーザーの同意設定に従ってデータが取り扱われ、
 * 同意のないデータ処理は実行されない
 */
