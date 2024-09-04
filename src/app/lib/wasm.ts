
export interface WasmModule extends EmscriptenModule {
    PThread: { runningWorkers: Worker[] };
    FS: typeof FS;
    ccall: typeof ccall;
}


export class WASM {

    constructor(
        public moduleName: string
    ) {
        const w: any = window
        this.factory = w[moduleName]
    }

    factory: EmscriptenModuleFactory<WasmModule>
    module = {} as WasmModule
    worker = {} as Worker

    async init(
    ) {
        return new Promise<void>(async (resolve, reject) => {
            this.module = await this.factory()
            // console.log(this.module);

            const { runningWorkers } = this.module.PThread
            this.worker = runningWorkers[0]


            const errListener = (ev: ErrorEvent) => {
                reject(ev.error)
                this.worker.removeEventListener('error', errListener)
            }
            this.worker.addEventListener('error', errListener)


            const readyListener = (ev: MessageEvent) => {
                const message = ev.data;
                if (!message || message.em_cmd !== 'main_thread_ready') {
                    return
                }
                resolve()
                this.worker.removeEventListener('message', readyListener)
            }
            this.worker.addEventListener('message', readyListener)
        })
    }


    exit() {
        this.module.ccall('em_exit', null, [], [])
    }
}