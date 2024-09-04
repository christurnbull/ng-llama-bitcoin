import { MessageLogComponent } from "../components/message-log/message-log.component";
import { GGUFModel } from "./dexie";
import { WasmModule as WasmModuleBase } from "./wasm"
import { WASM } from "./wasm"

interface WasmModule extends WasmModuleBase {
    EmLlamaCpp: new () => any;
}

export class Llama {

    constructor(
        wasm: WASM) {
        this.#wasm = wasm
    }

    cpp: any
    #wasm: WASM
    #onmessage: ((event: MessageEvent) => void) | undefined = undefined

    async init(
        n_threads: number = 1,
        messageLog: MessageLogComponent
    ) {
        const module = this.#wasm.module as WasmModule
        this.cpp = new module.EmLlamaCpp()
        await this.cpp.init(n_threads)

        this.#onmessage = (ev: MessageEvent) => {
            const message = ev.data;
            if (!message || !message.em_cmd) {
                return
            }

            if (message.em_cmd === 'msg') {
                messageLog.log(message.data)

            } else if (message.em_cmd === 'msgAppend') {
                const curItem = messageLog.messages[messageLog.messages.length - 1]
                if (message.data.text) {
                    curItem.text += message.data.text.replace(/\n/g, '')
                }
                if (message.data.pending !== undefined) {
                    curItem.pending = message.data.pending
                }
            }
        }
        this.#wasm.worker.addEventListener('message', this.#onmessage)
    }

    async destroy(
        model?: GGUFModel
    ) {
        await this.cpp.destroy()
        if (model) {
            this.#wasm.module.FS.unlink(model.id)
        }
        if (this.#onmessage) {
            this.#wasm.worker.removeEventListener('message', this.#onmessage)
            this.#onmessage = undefined
        }
        this.cpp = undefined
    }

    async loadModel(
        model: GGUFModel
    ) {
        this.#wasm.module.FS.writeFile(model.id, new Uint8Array(model.bytes))
        await this.cpp.load_model(model.id)
    }

    async predict(prompt: string) {
        const pred: string = await this.cpp.predict(prompt)
        return pred
    }

}