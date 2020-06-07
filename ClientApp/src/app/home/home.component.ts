import { Component, OnInit} from '@angular/core';
import * as signalR from "@microsoft/signalr";
import { HubConnection} from "@microsoft/signalr";
import { BehaviorSubject, from, fromEvent, Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

declare var MediaRecorder: any;

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {


	public userRecording = new BehaviorSubject(false);

	private connection: HubConnection;
	private audioContext = new AudioContext();
	private subject = new signalR.Subject();
	private record$: Subscription;

	private recordChunkTime = 500;

	async ngOnInit(): Promise<void> {
		await this.initServerConnection();
		await this.initStream();
		this.recordByKey();
	}

	private async initStream(){
		await this.connection.send("StartVoiceStream", this.subject);
		from(navigator.mediaDevices.getUserMedia({audio: true}))
			.subscribe({
				next: stream => {

					let mr = new MediaRecorder(stream);
					let reader = new FileReader();
					reader.onload = async data => {

						this.subject.next(reader.result)
					}

					mr.ondataavailable = e => {
						reader.readAsBinaryString(e.data)
					};

					let observeRecord = new Observable(subscriber => {
						mr.start();
						let interval = setInterval(() => {
							mr.stop();
							mr.start();
						}, this.recordChunkTime);

						return () => {
							mr.stop();
							clearTimeout(interval);
						}
					})
					this.userRecording.subscribe(needToRecord => {
						if(needToRecord && mr.state === 'inactive'){
							this.record$ = observeRecord.subscribe();
							return;
						}
						this.record$ && this.record$.unsubscribe();
					})

					this.subscribe();
				},
				error: () => {
					alert("Microphone is disable");
				}
			})
	}

	private async initServerConnection() {
		this.connection = new signalR.HubConnectionBuilder()
			.withUrl('/stream')
			.build();
		await this.connection.start();
	}

	private str2ab(str) {
		var buf = new ArrayBuffer(str.length);
		var bufView = new Uint8Array(buf);
		for (var i=0, strLen=str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

	private subscribe() {
		this.connection.stream<string>("WatchStream")
			.subscribe({
				next: async data => {
					let buffer = this.str2ab(data);
					let audioBuffer = await this.audioContext.decodeAudioData(buffer);
					let source = this.audioContext.createBufferSource();
					// source.playbackRate.value = audioBuffer.duration / this.recordChunkTime;
					source.buffer = audioBuffer;
					source.connect(this.audioContext.destination);
					source.start();
				},
				error(err: any): void {
				},
				complete(): void {
				}
			})
	}

	public toggleRecordButton(){
		this.userRecording.next(!this.userRecording.value)
	}

	private recordByKey() {

		['keydown', 'keyup'].forEach(eventName => {
			fromEvent<KeyboardEvent>(document, eventName)
				.pipe(
					this.getFilterForKey("ControlLeft")
				)
				.subscribe((e) => {
					this.userRecording.next(eventName === 'keydown');
				})
		})
	}

	private getFilterForKey<T extends KeyboardEvent>(keyCode: string){
		return filter<T>(e => e.code === keyCode);
	}
}
