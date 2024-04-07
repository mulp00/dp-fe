export const encryptStringWithAesCtr =
    async (plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> => {
        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const encodedText = str2ab(plaintext);
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-CTR",
                counter: iv,
                length: 128,
            },
            key,
            encodedText
        );
        return {
            ciphertext: ab2base64(encryptedData),
            iv: ab2base64(iv)
        };
    };

export const decryptStringWithAesCtr = async (ciphertext: string, key: CryptoKey, iv: string): Promise<string> => {
    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: "AES-CTR",
            counter: base64ab(iv), // The counter (IV) must be the same as the encryption
            length: 128,
        },
        key,
        base64ab(ciphertext)
    );
    return ab2str(decryptedData);
};

export const importAesKey = async (rawKey: Uint8Array): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey(
        "raw", // Raw format of the key
        rawKey, // The key as Uint8Array
        {   // Algorithm details
            name: "AES-CTR"
        },
        false, // Whether the key is extractable (i.e., can be used in exportKey)
        ["encrypt", "decrypt"] // Key usages
    );
};

const str2ab = (str: string): ArrayBuffer => {
    const encoder = new TextEncoder();
    return encoder.encode(str);
};

// ArrayBuffer to base64 string
const ab2base64 = (buffer: ArrayBuffer): string => {
    const array = Array.from(new Uint8Array(buffer));
    return btoa(String.fromCharCode(...array));
};

// Base64 string to ArrayBuffer
const base64ab = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

// ArrayBuffer to string
const ab2str = (buffer: ArrayBuffer): string => {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
};