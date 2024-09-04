import { Injectable } from '@angular/core';
import { DexieDB } from '../lib/dexie';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelService {

  constructor(
    private http: HttpClient,
  ) { }

  db = new DexieDB()

  async haveModel(
    id: string
  ) {
    const count = await this.db.ggufModel.where('id').equals(id).count()
    return count > 0
  }

  async getModel(
    id: string,
    url?: string,
  ) {
    let model = await this.db.ggufModel.get(id)
    if (!model && url) {
      const bytes = await this.downloadModel(url)
      model = {
        id,
        bytes,
        size: bytes.byteLength
      }
      await this.db.ggufModel.add(model)
    }
    return model
  }


  async downloadAndStoreModel(
    id: string,
    url: string
  ) {
    const bytes = await this.downloadModel(url)
    const model = {
      id,
      bytes,
      size: bytes.byteLength
    }
    await this.db.ggufModel.add(model)
  }


  async downloadModel(
    url: string
  ) {
    return firstValueFrom(this.http.get(url, { responseType: 'arraybuffer' }))

    // let count = 0
    // const reqs = Array.from(new Array(numShards))
    //   .map((v, i) => this.http.get(
    //     `/assets/${name}/${name}-${i}.bin`, { responseType: 'arraybuffer' }).pipe(
    //       tap(() => {
    //         count++
    //         console.log('done', i, count)
    //       })
    //     )
    //   )

    // const shards = await firstValueFrom(forkJoin(reqs))
    // const blob = new Blob(shards)
    // const buffer = await blob.arrayBuffer()
    // return buffer
  }


  async destroyModel(id: string) {
    await this.db.ggufModel.where({ id }).delete()
  }
}
