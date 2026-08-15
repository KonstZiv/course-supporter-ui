import { apiErrorFromBody, apiUrl, resolveApiKeyOrThrow } from './client'

export interface UploadProgress {
  /** Bytes sent so far. */
  loaded: number
  /** Total request-body bytes (file plus the small multipart envelope). */
  total: number
}

/**
 * File-send transport on XMLHttpRequest — the only browser mechanism that
 * reports upload progress (``fetch`` has no upload-progress surface). Shares
 * the read client's key, URL and error-shape helpers so a rejection carries
 * the same ``ApiError`` (status + parsed body) as any read (Е1) — parity, not
 * a copy.
 *
 * Deliberately as thin as the read client: no client timeout (the server's
 * 900 s is the only limit), no retry, no cancellation (``DD-AV-H``/``DD-AV-J``
 * are separate). One request per call — the batch cycle sequences them.
 */
export function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let apiKey: string
    try {
      apiKey = resolveApiKeyOrThrow()
    } catch (err) {
      reject(err) // ApiError(401) before any bytes leave — mirrors the read path
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl(path))
    xhr.setRequestHeader('X-API-Key', apiKey)
    // No Content-Type: the browser derives multipart/form-data + boundary from
    // the FormData body (mirrors the read client's FormData branch).

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.({ loaded: event.loaded, total: event.total })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (xhr.status === 204 || !xhr.responseText) {
          resolve(undefined as T)
          return
        }
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          // A non-JSON success body mirrors fetch's res.json() rejecting.
          reject(new Error('Malformed response body'))
        }
        return
      }
      reject(apiErrorFromBody(xhr.status, xhr.responseText))
    }

    // Network-level failure: reject with a non-ApiError, as fetch rejects with
    // a TypeError — the caller falls back to product-language text.
    xhr.onerror = () => reject(new Error('Network error while uploading'))

    xhr.send(formData)
  })
}
