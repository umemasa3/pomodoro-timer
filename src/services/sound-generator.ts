/**
 * サウンド生成サービス - Web Audio APIを使用してプログラム的にサウンドを生成
 */

export type GeneratedSoundType = 'bell' | 'chime' | 'notification';

export class SoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * AudioContextを初期化
   */
  private initializeAudioContext(): void {
    try {
      // WebKit系ブラウザ対応のためのキャスト
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('AudioContextの初期化に失敗しました:', error);
    }
  }

  /**
   * ベル音を生成
   */
  private generateBellSound(duration: number = 0.5): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // ベル音の周波数成分
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      // 複数の周波数を重ね合わせ
      frequencies.forEach((freq, index) => {
        const amplitude = Math.exp(-time * 3) * (0.3 / (index + 1));
        sample += amplitude * Math.sin(2 * Math.PI * freq * time);
      });

      data[i] = sample;
    }

    return buffer;
  }

  /**
   * チャイム音を生成
   */
  private generateChimeSound(duration: number = 0.8): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // チャイム音の周波数（ペンタトニックスケール）
    const frequencies = [261.63, 293.66, 329.63, 392.0, 440.0]; // C4, D4, E4, G4, A4

    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      // 順次鳴らすチャイム効果
      frequencies.forEach((freq, index) => {
        const startTime = index * 0.15;
        const noteTime = time - startTime;

        if (noteTime >= 0 && noteTime <= 0.4) {
          const amplitude = Math.exp(-noteTime * 2) * 0.2;
          sample += amplitude * Math.sin(2 * Math.PI * freq * noteTime);
        }
      });

      data[i] = sample;
    }

    return buffer;
  }
  /**
   * 通知音を生成
   */
  private generateNotificationSound(
    duration: number = 0.3
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // シンプルな通知音（2つの音程）
    const freq1 = 800; // 高い音
    const freq2 = 600; // 低い音

    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;
      let sample = 0;

      if (time < duration / 2) {
        // 前半は高い音
        const amplitude = Math.exp(-time * 8) * 0.3;
        sample = amplitude * Math.sin(2 * Math.PI * freq1 * time);
      } else {
        // 後半は低い音
        const noteTime = time - duration / 2;
        const amplitude = Math.exp(-noteTime * 8) * 0.3;
        sample = amplitude * Math.sin(2 * Math.PI * freq2 * noteTime);
      }

      data[i] = sample;
    }

    return buffer;
  }

  /**
   * 指定されたタイプのサウンドを生成
   */
  public generateSound(soundType: GeneratedSoundType): AudioBuffer | null {
    switch (soundType) {
      case 'bell':
        return this.generateBellSound();
      case 'chime':
        return this.generateChimeSound();
      case 'notification':
        return this.generateNotificationSound();
      default:
        return null;
    }
  }

  /**
   * サウンドを再生
   */
  public async playGeneratedSound(
    soundType: GeneratedSoundType,
    volume: number = 0.5
  ): Promise<void> {
    if (!this.audioContext) {
      console.warn('AudioContextが利用できません');
      return;
    }

    // AudioContextが停止している場合は再開
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const audioBuffer = this.generateSound(soundType);

      if (!audioBuffer) {
        console.warn(`サウンド ${soundType} の生成に失敗しました`);
        return;
      }

      // AudioBufferSourceNodeを作成
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      // 音量を設定
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      // ノードを接続
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 再生
      source.start();
    } catch (error) {
      console.error('サウンドの再生に失敗しました:', error);
    }
  }

  /**
   * リソースをクリーンアップ
   */
  public cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
