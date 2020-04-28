import {Component, OnInit} from '@angular/core';
import {from, Subject} from "rxjs";
import * as signalR from "@microsoft/signalr";
import {HubConnectionState} from "@microsoft/signalr";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {

  private cancellationToken = new Subject<void>();
  private connection: signalR.HubConnection;
  private subject = new signalR.Subject();

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

          let context = new AudioContext({
            sampleRate: 3000
          });
          let recorder = context.createScriptProcessor(1024, 1, 1);
          recorder.connect(context.destination);

          let audioInput = context.createMediaStreamSource(stream);
          audioInput.connect(recorder);

          const voiceHandler = e => {
            if(!this.record){
              return;
            }
            let data: number[] = [];
            e.inputBuffer.getChannelData(0).forEach(b => {
              data.push(b)
            });
            this.subject.next(data);
          };


          let buffer = context.createBuffer(1, 1024, context.sampleRate);
          this.subscribe(buffer);

          let source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.loop = true;
          source.start();


          recorder.addEventListener("audioprocess", voiceHandler);
          this.cancellationToken.subscribe(() => {
            recorder.removeEventListener("audioprocess", voiceHandler);
          })
        },
        error: () => {
          alert("Microphone is disable");
        }
    })
  }

  private subscribe(buffer: AudioBuffer) {
    this.connection.stream<number[]>("WatchStream")
      .subscribe({
        next(value: number[]): void {
          let nowBuffering = buffer.getChannelData(0);
          for(let i = 0; i < value.length; i++){
            nowBuffering[i] = value[i];
          }
        },
        error(err: any): void {
        },
        complete(): void {
        }
      })
  }
}
