import Dexie, { Table } from 'dexie';

export interface GGUFModel {
    id: string;
    bytes: ArrayBuffer;
    size: number
}

export class DexieDB extends Dexie {

    ggufModel!: Table<GGUFModel, string>;

    constructor() {
        super('wasmLlamaCpp');
        this.version(1).stores({
            ggufModel: 'id',
        });
    }
}
