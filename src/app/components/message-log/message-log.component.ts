import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';

export type LogMessageType = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'

export class LogMessage {

  constructor(
    message: Partial<LogMessage>
  ) {
    Object.assign(this, message)
  }

  type: LogMessageType = 'INFO'
  text: string = ''
  timestamp: number = Date.now()
  pending: boolean = false
}

@Component({
  selector: 'message-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-log.component.html',
  styleUrl: './message-log.component.scss'
})
export class MessageLogComponent implements OnInit {

  constructor(
    private elRef: ElementRef,
    private cd: ChangeDetectorRef
  ) { }

  messages: LogMessage[] = []
  window!: HTMLDivElement

  ngOnInit(): void {
    this.window = this.elRef.nativeElement.children[0]
  }

  log(message: Partial<LogMessage>) {
    const msg = message instanceof LogMessage ? message : new LogMessage(message)
    this.messages.push(msg)
    this.cd.detectChanges()
    this.window.scrollTop = this.window.scrollHeight
    return msg
  }

  clear() {
    this.messages = []
  }
}
