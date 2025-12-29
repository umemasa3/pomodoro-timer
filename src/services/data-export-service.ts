import { supabase } from './supabase';
import type {
  UserDataExport,
  User,
  Task,
  Session,
  Tag,
  Goal,
  PrivacySettings,
  SessionStatistics,
  TaskStatistics,
  TagStatistics,
} from '../types';

/**
 * データエクスポートサービス
 * ユーザーの全データをJSON形式でエクスポートする機能を提供
 */
export class DataExportService {
  /**
   * ユーザーの全データをエクスポート
   * @param userId - エクスポート対象のユーザーID
   * @returns エクスポートされたデータ
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    try {
      // 並列でデータを取得
      const [profile, tasks, sessions, tags, goals, privacySettings] =
        await Promise.all([
          this.getUserProfile(userId),
          this.getUserTasks(userId),
          this.getUserSessions(userId),
          this.getUserTags(userId),
          this.getUserGoals(userId),
          this.getPrivacySettings(userId),
        ]);

      // 統計データを計算
      const statistics = this.calculateStatistics(sessions, tasks, tags);

      const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        format: 'JSON',
        data: {
          profile,
          tasks,
          sessions,
          tags,
          goals,
          settings: profile.settings,
          statistics,
          privacySettings,
        },
      };

      // エクスポートログを記録
      await this.logDataExport(userId);

      return exportData;
    } catch (error) {
      console.error('データエクスポートエラー:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  /**
   * ユーザープロファイルを取得
   */
  private async getUserProfile(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * ユーザーのタスクを取得
   */
  private async getUserTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * ユーザーのセッションを取得
   */
  private async getUserSessions(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * ユーザーのタグを取得
   */
  private async getUserTags(userId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * ユーザーの目標を取得
   */
  private async getUserGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * プライバシー設定を取得
   */
  private async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // プライバシー設定が存在しない場合はデフォルト値を返す
      return {
        dataProcessingConsent: true,
        analyticsConsent: false,
        marketingConsent: false,
        consentDate: new Date().toISOString(),
        consentVersion: '1.0',
      };
    }

    return {
      dataProcessingConsent: data.data_processing_consent,
      analyticsConsent: data.analytics_consent,
      marketingConsent: data.marketing_consent,
      consentDate: data.consent_date,
      consentVersion: data.consent_version,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
    };
  }

  /**
   * 統計データを計算
   */
  private calculateStatistics(
    sessions: Session[],
    tasks: Task[],
    tags: Tag[]
  ): {
    sessions: SessionStatistics;
    tasks: TaskStatistics;
    tags: TagStatistics;
  } {
    // セッション統計
    const completedSessions = sessions.filter(s => s.completed);
    const totalWorkTime = completedSessions
      .filter(s => s.type === 'pomodoro')
      .reduce((sum, s) => sum + s.actual_duration, 0);

    const sessionStats: SessionStatistics = {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalWorkTime,
      averageSessionLength:
        completedSessions.length > 0
          ? totalWorkTime /
            completedSessions.filter(s => s.type === 'pomodoro').length
          : 0,
      streakDays: this.calculateCurrentStreak(sessions),
      longestStreak: this.calculateLongestStreak(sessions),
    };

    // タスク統計
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const taskStats: TaskStatistics = {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      averageTaskCompletion:
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      tasksByPriority: {
        low: tasks.filter(t => t.priority === 'low').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        high: tasks.filter(t => t.priority === 'high').length,
      },
    };

    // タグ統計
    const tagStats: TagStatistics = {
      tagUsage: tags.reduce(
        (acc, tag) => {
          acc[tag.name] = tag.usage_count;
          return acc;
        },
        {} as Record<string, number>
      ),
      mostProductiveTag: this.getMostProductiveTag(tags),
      timeByTag: this.calculateTimeByTag(sessions, tasks, tags),
    };

    return {
      sessions: sessionStats,
      tasks: taskStats,
      tags: tagStats,
    };
  }

  /**
   * 現在のストリークを計算
   */
  private calculateCurrentStreak(sessions: Session[]): number {
    // 簡単な実装：連続した日数を計算
    const workSessions = sessions
      .filter(s => s.type === 'pomodoro' && s.completed)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

    if (workSessions.length === 0) return 0;

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of workSessions) {
      const sessionDate = new Date(session.started_at);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * 最長ストリークを計算
   */
  private calculateLongestStreak(sessions: Session[]): number {
    // 簡単な実装：過去の最長連続日数を計算
    const workSessions = sessions
      .filter(s => s.type === 'pomodoro' && s.completed)
      .sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );

    if (workSessions.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;
    let lastDate = new Date(workSessions[0].started_at);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < workSessions.length; i++) {
      const sessionDate = new Date(workSessions[i].started_at);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (daysDiff > 1) {
        currentStreak = 1;
      }

      lastDate = sessionDate;
    }

    return maxStreak;
  }

  /**
   * 最も生産性の高いタグを取得
   */
  private getMostProductiveTag(tags: Tag[]): string {
    if (tags.length === 0) return '';

    const mostUsedTag = tags.reduce((prev, current) =>
      prev.usage_count > current.usage_count ? prev : current
    );

    return mostUsedTag.name;
  }

  /**
   * タグ別の作業時間を計算
   */
  private calculateTimeByTag(
    sessions: Session[],
    tasks: Task[],
    tags: Tag[]
  ): Record<string, number> {
    const timeByTag: Record<string, number> = {};

    // タグ名でインデックスを作成
    const tagMap = new Map(tags.map(tag => [tag.id, tag.name]));

    // タスクベースのセッションの時間を集計
    sessions
      .filter(s => s.type === 'pomodoro' && s.completed && s.task_id)
      .forEach(session => {
        const task = tasks.find(t => t.id === session.task_id);
        if (task && task.tags) {
          task.tags.forEach(tag => {
            const tagName = tagMap.get(tag.id) || tag.name;
            timeByTag[tagName] =
              (timeByTag[tagName] || 0) + session.actual_duration;
          });
        }
      });

    return timeByTag;
  }

  /**
   * データエクスポートのログを記録
   */
  private async logDataExport(userId: string): Promise<void> {
    try {
      await supabase.from('data_export_logs').insert({
        user_id: userId,
        exported_at: new Date().toISOString(),
        export_type: 'full_data',
        status: 'completed',
      });
    } catch (error) {
      // ログ記録の失敗はエクスポート処理を止めない
      console.warn('データエクスポートログの記録に失敗:', error);
    }
  }

  /**
   * エクスポートデータをJSONファイルとしてダウンロード
   */
  downloadAsJson(exportData: UserDataExport, filename?: string): void {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download =
      filename ||
      `pomodoro-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}

// シングルトンインスタンスをエクスポート
export const dataExportService = new DataExportService();
