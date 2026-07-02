package com.linagora.twakedrive.fileprovider

import android.content.Context
import java.io.File

class DocumentCache(private val context: Context) {

    private fun dir(): File = File(context.cacheDir, "fileprovider").apply { mkdirs() }

    fun cachedFile(id: String): File = File(dir(), id)

    /** Read-only fast path over the RN-owned pinned offline blob. */
    fun offlineBlob(id: String): File? =
        File(context.filesDir, "offline/$id").takeIf { it.exists() }

    /** A local, readable copy: pinned blob if present, else download to cache. */
    fun ensureLocal(id: String, api: CozyStackApi): File {
        offlineBlob(id)?.let { return it }
        val dest = cachedFile(id)
        if (!dest.exists() || dest.length() == 0L) {
            val tmp = File(dir(), "$id.dl")
            api.download(id, tmp)
            if (!tmp.renameTo(dest)) { tmp.copyTo(dest, overwrite = true); tmp.delete() }
        }
        return dest
    }

    fun tempFor(id: String): File = File(dir(), "$id.tmp")
}
