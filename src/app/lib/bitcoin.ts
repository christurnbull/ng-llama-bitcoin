import { secp256k1 } from '@noble/curves/secp256k1';
import * as btc from '@scure/btc-signer'
import { base58 } from '@scure/base';

export type BitcoinAddressFormat = 'pkh' | 'wpkh' | 'tr' | 'sh'
export type BitcoinAddress = {
    format?: BitcoinAddressFormat;
    privateKey: Uint8Array;
    address?: string;
    privateKeyBase58: string
}

export const generateBitcoinAddress = (
    privateKey: Uint8Array,
    format: BitcoinAddressFormat = 'pkh'
): BitcoinAddress => {
    // pkh - public key hash - begins "1"
    // wpkh - witness public key hash - begins "bc1q"
    // tr - taproot - begins "bc1p"
    // sh - script hash - begins "3"

    let address: string | undefined
    if (format === 'sh') {
        const publicKey = secp256k1.getPublicKey(privateKey);
        const sh = btc.p2sh(btc.p2pkh(publicKey))
        address = sh.address
    } else {
        address = btc.getAddress(format, privateKey)
    }

    const privateKeyBase58 = base58.encode(privateKey)
    return {
        format, privateKey, address, privateKeyBase58
    }
}

export const generateRandomBitcoinAddress = (
    format: BitcoinAddressFormat = 'pkh'
): BitcoinAddress => {
    const privateKey = btc.utils.randomPrivateKeyBytes()
    return generateBitcoinAddress(privateKey, format)
}



export const identifyFormat = (
    address: string
): BitcoinAddressFormat | undefined => {
    if (address.length < 25 || address.length > 34) {
        return undefined
    }
    if (address[0] === '1') {
        return 'pkh'
    } else if (address[0] === '3') {
        return 'sh'
    } else if (address.slice(0, 4) === 'bc1q') {
        return 'wpkh'
    } else if (address.slice(0, 4) === 'bc1p') {
        return 'tr'
    }
    return undefined
}

export const privateKeyMatchAddress = (
    bitcoinAddress: BitcoinAddress,
) => {
    const privateKey = base58.decode(bitcoinAddress.privateKeyBase58)
    const b = generateBitcoinAddress(privateKey, bitcoinAddress.format)
    return b.address === bitcoinAddress.address
}