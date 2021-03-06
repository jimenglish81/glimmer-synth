import { Note } from '../note';

export const VOLUME_MAX: number = 1.5;
export const VOLUME_INCREMENT: number = VOLUME_MAX / 10;

/* tslint:disable */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const noop = () => {};
/* tslint:enable */

export class AudioService {
  public audio: HTMLAudioElement;
  public context: AudioContext;
  public hasAudioRecording: boolean;
  public volume: number;
  private analyser: AnalyserNode;
  private analyserFreqs: Uint8Array;
  private audioData: Blob[];
  private effect: ConvolverNode;
  private masterVolume: GainNode;
  private mediaRecorder: MediaRecorder;

  constructor() {
    this.context = new AudioCtx();
    this.audio = new Audio();
    this.audioData = [];
    this.hasAudioRecording = false;
    this.volume = VOLUME_INCREMENT * 2;
  }

  public static get supportsAudio(): boolean {
    return !!AudioCtx;
  }

  public static get supportsRecording(): boolean {
    return !!window.MediaStreamAudioDestinationNode;
  }

  public createNote(note: string, octave: number): Note {
    this.setUp();
    return new Note(note, octave, this.context, this.masterVolume);
  }

  public decrementVolume(): void {
    this.setUp();
    const { masterVolume } = this;
    const newValue = masterVolume.gain.value - VOLUME_INCREMENT;
    this.volume = masterVolume.gain.value = Math.max(newValue, 0);
  }

  public getAnalyserData(): Uint8Array {
    const { analyser, analyserFreqs = new Uint8Array(0) } = this;
    if (analyser) {
      analyser.getByteFrequencyData(analyserFreqs);
    }
    return analyserFreqs;
  }

  public incrementVolume(): void {
    this.setUp();
    const { masterVolume } = this;
    const newValue = masterVolume.gain.value + VOLUME_INCREMENT;
    this.volume = masterVolume.gain.value = Math.min(newValue, VOLUME_MAX);
  }

  public startRecording(): void {
    this.setUp();
    const { context, mediaRecorder, masterVolume } = this;
    this.audioData = [];
    const silence = context.createBufferSource();
    silence.connect(masterVolume);
    mediaRecorder.start(0);
  }

  public stopRecording(): void {
    this.setUp();
    this.mediaRecorder.stop();
  }

  private setUp(): void {
    this.setUpVolume();
    this.setUpEffect();
    this.setUpMediaRecorder();
    this.setUpAnalyser();

    this.setUp = noop;
  }

  private setUpAnalyser(): void {
    const { context, effect, masterVolume } = this;
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    const analyserFreqs = new Uint8Array(analyser.frequencyBinCount);
    analyser.connect(context.destination);
    masterVolume.connect(analyser);
    effect.connect(analyser);
    this.analyser = analyser;
    this.analyserFreqs = analyserFreqs;
  }

  private setUpEffect(): void {
    // create white noise.
    const { context, masterVolume } = this;
    const { sampleRate } = context;
    const convolver = context.createConvolver();
    const buffer = context.createBuffer(2, 0.5 * sampleRate, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      left[i] = Math.random() * 6 - 1;
      right[i] = Math.random() * 6 - 1;
    }
    convolver.buffer = buffer;
    convolver.connect(context.destination);
    this.masterVolume.connect(convolver);
    this.effect = convolver;
  }

  private setUpMediaRecorder(): void {
    const { audio, audioData, context, effect, masterVolume } = this;
    if (AudioService.supportsRecording) {
      const dest = context.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(dest.stream);
      mediaRecorder.ignoreMutedMedia = false;

      mediaRecorder.ondataavailable = ({ data }) => audioData.push(data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioData, {
          type: 'audio/ogg; codecs=opus',
        });
        audio.src = URL.createObjectURL(blob);
        audio.loop = true;
        this.hasAudioRecording = true;
      };

      masterVolume.connect(dest);
      effect.connect(dest);
      this.mediaRecorder = mediaRecorder;
    }
  }

  private setUpVolume(): void {
    const masterVolume = this.context.createGain();
    masterVolume.gain.value = this.volume;
    masterVolume.connect(this.context.destination);
    this.masterVolume = masterVolume;
  }
}

export default new AudioService();
