package com.linagora.twakedrive.fileprovider

import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

@RunWith(RobolectricTestRunner::class)
class DocumentCacheTest {
    private val ctx = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test fun `cachedFile lives under cacheDir fileprovider`() {
        val f = DocumentCache(ctx).cachedFile("abc")
        assertTrue(f.absolutePath.contains("/cache/"))
        assertTrue(f.absolutePath.endsWith("/fileprovider/abc"))
    }

    @Test fun `offlineBlob returns the pinned file when present`() {
        val cache = DocumentCache(ctx)
        assertNull(cache.offlineBlob("xyz"))
        val blob = File(ctx.filesDir, "offline/xyz").apply { parentFile?.mkdirs(); writeText("hi") }
        assertEquals(blob, cache.offlineBlob("xyz"))
    }

    @Test fun `invalidate deletes both the cached content and thumbnail`() {
        val cache = DocumentCache(ctx)
        val content = cache.cachedFile("x").apply { parentFile?.mkdirs(); writeText("old content") }
        val thumb = cache.cachedFile("x.thumb").apply { parentFile?.mkdirs(); writeText("old thumb") }
        assertTrue(content.exists())
        assertTrue(thumb.exists())

        cache.invalidate("x")

        assertTrue(!content.exists())
        assertTrue(!thumb.exists())
    }
}
