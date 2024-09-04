import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModelService } from './services/model.service';
import { Llama } from './lib/llama';
import { BitcoinAddress, generateRandomBitcoinAddress, identifyFormat, privateKeyMatchAddress } from './lib/bitcoin';
import { FormsModule } from '@angular/forms';
import { GGUFModel } from './lib/dexie';
import { TwButtonProgressDirective } from './directives/tw-button-progress.directive';
import { CommonModule } from '@angular/common';
import { MessageLogComponent } from "./components/message-log/message-log.component";
import { WASM } from './lib/wasm';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TwButtonProgressDirective, CommonModule, MessageLogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(
    private modelService: ModelService,
  ) {
  }

  inferencing = false

  numSamples = 2
  numThreads = navigator.hardwareConcurrency
  model: GGUFModel | undefined
  bitcoinAddress: BitcoinAddress = generateRandomBitcoinAddress()
  @ViewChild(MessageLogComponent) messageLog: MessageLogComponent | undefined
  modelId = 'h2o-danube3-500m-base-Q4_K_M-GGUF'
  modelUrl = 'https://huggingface.co/lobkov/h2o-danube3-500m-base-Q4_K_M-GGUF/resolve/main/h2o-danube3-500m-base-q4_k_m.gguf?download=true'
  haveLLM = false
  wasm = new WASM('wasmLlamaCpp')
  llama = new Llama(this.wasm)
  busy = {
    downloadLLM: false,
    deleteLLM: false,
    genAddress: false,
    predict: false,
    close: false
  }


  async ngOnInit() { }

  async ngAfterViewInit() {
    this.haveLLM = await this.modelService.haveModel(this.modelId)
    setTimeout(() => {
      if (this.haveLLM) {
        this.messageLog!.log({ text: 'LLM is stored in the browser using IndexedDB.', type: 'INFO' })
      }
      this.genAddress()
    })
    await this.wasm.init();
  }

  ngOnDestroy(): void {
    this.llama.destroy()
  }

  async downloadLLM() {
    this.busy.downloadLLM = true
    const msg = this.messageLog!.log({ text: 'Downloading LLM... ', type: 'INFO', pending: true })
    try {
      await this.modelService.downloadAndStoreModel(this.modelId, this.modelUrl)
      this.haveLLM = true
      this.messageLog!.log({ text: 'LLM is stored in the browser using IndexedDB.', type: 'INFO' })
      msg.text += 'Done.'
      msg.pending = false
    } catch (e: any) {
      this.messageLog!.log({ text: `Could not download model. ${e.statusText}`, type: 'ERROR' })
      msg.pending = false
    }
    this.busy.downloadLLM = false
  }

  async deleteLLM() {
    this.busy.deleteLLM = true
    await this.modelService.destroyModel(this.modelId)
    this.haveLLM = false
    this.messageLog!.log({ text: 'Deleted LLM from the browser IndexedDB store.', type: 'INFO' })
    this.busy.deleteLLM = false
  }

  genAddress() {
    this.busy.genAddress = true
    this.bitcoinAddress = generateRandomBitcoinAddress()
    this.messageLog!.log({ text: 'Generated random Bitcoin address.', type: 'INFO' })
    this.busy.genAddress = false
  }

  setInputAddress(addr: string) {
    const format = identifyFormat(addr)
    this.bitcoinAddress.address = addr
    this.bitcoinAddress.privateKey = new Uint8Array()
    this.bitcoinAddress.privateKeyBase58 = ''
    if (!format) {
      this.bitcoinAddress.format = undefined
      this.messageLog!.log({ text: 'Invalid address format.', type: 'ERROR' })
    } else {
      this.bitcoinAddress.format = format
      this.messageLog!.log({ text: 'Set new Bitcoin address.', type: 'INFO' })
    }
  }

  async predict() {

    this.busy.predict = true

    if (!this.llama.cpp) {
      const nThreads = navigator.hardwareConcurrency
      const msg = this.messageLog!.log({
        text: `Initialising Llama.cpp (using ${nThreads} threads)... `,
        type: 'INFO',
        pending: true
      })
      await this.llama.init(nThreads, this.messageLog!)
      msg.text += 'Done.'
      msg.pending = false
    }

    if (!this.model) {
      const msg = this.messageLog!.log({
        text: 'Retrieving LLM from IndexedDB... ',
        type: 'INFO',
        pending: true
      })
      this.model = await this.modelService.getModel(this.modelId)

      if (!this.model) {
        this.messageLog!.log({ text: 'Could not retrieve LLM from IndexedDB.', type: 'ERROR' })
      } else {
        msg.text += 'Done.'
        msg.pending = false

        const msg2 = this.messageLog!.log({
          text: 'Loading LLM... ',
          type: 'INFO',
          pending: true
        })
        await this.llama.loadModel(this.model)
        this.model.bytes = new Uint8Array()
        msg2.text += 'Done.'; msg2.pending = false
      }
    }

    if (this.model) {
      await this.inference()
    }

    this.busy.predict = false
  }


  async closeLlama() {
    if (!this.llama.cpp) {
      return
    }
    this.busy.close = true
    const msg = this.messageLog!.log({
      text: 'Freeing memory reserved for Llama.cpp ... ',
      type: 'INFO',
      pending: true
    })
    await this.llama.destroy(this.model)
    this.model = undefined
    msg.text += 'Done.'; msg.pending = false
    this.busy.close = false
  }


  async inference() {
    const prompt = this.buildPrompt(this.bitcoinAddress)
    //   const prompt = 'test'
    this.messageLog!.log({ text: `Prompt: \n${prompt}`, type: 'WARN' })

    const predicted = await this.llama.predict(prompt)

    let match: boolean = false
    if (this.bitcoinAddress.privateKeyBase58 === '') {
      this.bitcoinAddress.privateKeyBase58 = predicted
      match = privateKeyMatchAddress(this.bitcoinAddress)
    } else if (predicted === this.bitcoinAddress.privateKeyBase58) {
      match = true
    }

    if (match) {
      this.messageLog!.log({ text: `Private key matches the address! \u{1F601}`, type: 'SUCCESS' })
    } else {
      this.messageLog!.log({ text: `Private key does not match the address \u{1F61E}`, type: 'ERROR' })
    }
  }


  destroyModel() {
    if (this.model) {
      this.modelService.destroyModel(this.model.id)
    }
  }


  buildPrompt(target: BitcoinAddress) {
    let prompt = ''
    for (let i = 0; i < this.numSamples; i++) {
      const addr = generateRandomBitcoinAddress()
      prompt += addr.address + ' ' + addr.privateKeyBase58 + '\n'
    }
    prompt += target.address + ' '
    return prompt
  }

}
