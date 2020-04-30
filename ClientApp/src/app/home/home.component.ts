import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {from, Subject} from "rxjs";
import * as signalR from "@microsoft/signalr";
import {HubConnectionState} from "@microsoft/signalr";
import MediaStreamRecorder from "msr";

declare var MediaRecorder: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {

  @ViewChild("player", {static: false})
  public audioPlayer: ElementRef<HTMLAudioElement>;

  private cancellationToken = new Subject<void>();
  private connection: signalR.HubConnection;
  private subject = new signalR.Subject();
  private audioContext = new AudioContext();

  private get record(): boolean{
    return this.connection.state === HubConnectionState.Connected;
  }

  async ngOnInit(): Promise<void> {
    await this.initConnection();
    await this.initStream();
  }

  private async initConnection() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("/stream")
      .build();

    await this.connection.start();
    this.connection.onclose(error => {
      this.cancellationToken.next();
      alert(`Disconnected! \n${error}`);
    });
  }

  private async initStream(){
    await this.connection.send("StartVoiceStream", this.subject);
    from(navigator.mediaDevices.getUserMedia({audio: true}))
      .subscribe({
        next: stream => {

          let mediaRecorder = new MediaStreamRecorder(stream);

          mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav




          let reader = new FileReader();

          let buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
          reader.onload = () => {
          }

          mediaRecorder.ondataavailable = blob => {
            reader.readAsArrayBuffer(blob);
          };
          mediaRecorder.start(500);

          /*
          let mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs="vorbis"'
          });

          let source = this.audioContext.createBufferSource();
          // source.buffer = buffer;
          source.connect(this.audioContext.destination);

          let reader = new FileReader();

          reader.onload = () => {
            this.audioContext.decodeAudioData(reader.result as ArrayBuffer, res => {
              console.log(res.duration)
            })
          }

          console.log(mediaRecorder.stream)
          mediaRecorder.addEventListener('dataavailable', data => {
            // reader.readAsBinaryString(data.data);
            reader.readAsArrayBuffer(data.data)
            // this.audioPlayer.src = URL.createObjectURL(data.data)
          });

          // this.audioPlayer.nativeElement.d

          mediaRecorder.start(500);

          this.cancellationToken.subscribe(() => {
            // clearInterval(interval);
            mediaRecorder.stop();
          })

          this.subscribe();
           */
        },
        error: () => {
          alert("Microphone is disable");
        }
    })
  }

  private subscribe() {
    this.connection.stream<string>("WatchStream")
      .subscribe({
        next: data => {


          this.audioContext.decodeAudioData(reader.result as ArrayBuffer, res => {
            var source = this.audioContext.createBufferSource();
            source.buffer = res;
            source.connect(this.audioContext.destination);
            source.start(0, 0, res.duration)
            // source.noteOn(0);
          })


          let blob = new Blob(this.stringToUint8Array(data), {
            type: "audio/webm;codecs=opu"
          })
          // this.audioPlayer.nativeElement.src = URL.createObjectURL(blob);
        },
        error(err: any): void {
        },
        complete(): void {
        }
      })
  }


   stringToUint8Array(binary) {
    let binLen, buffer, chars, i, _i;
    binLen = binary.length;
    buffer = new ArrayBuffer(binLen);
    chars  = new Uint8Array(buffer);
    for (i = _i = 0; 0 <= binLen ? _i < binLen : _i > binLen; i = 0 <= binLen ? ++_i : --_i) {
      chars[i] = String.prototype.charCodeAt.call(binary, i);
    }
    return chars;
  }
}
