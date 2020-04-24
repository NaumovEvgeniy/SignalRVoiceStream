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
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("/stream")
      .build();

    await this.connection.start();
    this.connection.onclose(error => {
      this.cancellationToken.next();
      alert(`Disconnected! \n${error}`);
    });
    await this.connection.send("VoiceStream", this.subject);
    await this.initStream();
  }

  private async initStream(){
    from(navigator.mediaDevices.getUserMedia({audio: true}))
      .subscribe({
        next: stream => {

          let context = new AudioContext();
          let recorder = context.createScriptProcessor(4096, 1, 1);
          recorder.connect(context.destination);

          let  audioInput = context.createMediaStreamSource(stream);
          audioInput.connect(recorder);

          const voiceHandler = e => {
            if(!this.record){
              return;
            }
            let data: number[] = [];
            e.inputBuffer.getChannelData(0).forEach(b => {
              data.push(b)
            });

            this.subject.next( Array.from(Array(15000).keys()));
          };

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
}
