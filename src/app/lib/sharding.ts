import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js"


export const shardFile = async (
    file: File,
    shardSizeBytes = 20000000   // 20 MB
) => {
    const buffer = await file.arrayBuffer()
    const numShards = Math.ceil(buffer.byteLength / shardSizeBytes)
    console.info(`creating ${numShards} shards`)
    const shards = Array.from(new Array<Uint8Array>(numShards))
        .map((v, i) => {
            const offset = i * shardSizeBytes
            return new Uint8Array(buffer.slice(offset, offset + shardSizeBytes))
        })
    return shards
}

export const downloadShards = async (
    filename: string,
    shards: Uint8Array[],
    ext: string = '.bin',
    doc: Document = (globalThis as any).document
) => {
    return new Promise<void>(async (resolve, reject) => {

        try {
            const zw = new ZipWriter(new BlobWriter('application/zip'))

            let i = 0
            for await (let shard of shards) {
                console.info(`adding shard ${i + 1} of ${shards.length} to zip`)
                const br = new BlobReader(new Blob([shard]))
                await zw.add(`${filename}-${i}${ext}`, br)
                i++
            }

            console.info(`closing zip`)
            const zip = await zw.close()

            const a = doc.createElement('a')
            a.download = `${filename}.zip`
            a.href = URL.createObjectURL(zip)
            a.onclick = () => {
                setTimeout(() => {
                    URL.revokeObjectURL(a.href)
                    resolve()
                })
            }
            a.onerror = (err) => reject(err)
            a.click()
        } catch (err) {
            reject(err)
        }
    })
}
