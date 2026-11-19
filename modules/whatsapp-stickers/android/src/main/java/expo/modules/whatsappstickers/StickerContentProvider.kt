package expo.modules.whatsappstickers

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException

/**
 * Expõe os pacotes para o WhatsApp, seguindo o contrato do app oficial de exemplo
 * (github.com/WhatsApp/stickers). Os dados são escritos pelo JS em
 * filesDir/packs/packs.json e filesDir/packs/<id>/<arquivo>.
 */
class StickerContentProvider : ContentProvider() {
  private val matcher = UriMatcher(UriMatcher.NO_MATCH)
  private lateinit var authority: String

  override fun onCreate(): Boolean {
    authority = context!!.packageName + ".stickercontentprovider"
    matcher.addURI(authority, "metadata", METADATA)
    matcher.addURI(authority, "metadata/*", METADATA_SINGLE)
    matcher.addURI(authority, "stickers/*", STICKERS)
    matcher.addURI(authority, "stickers_asset/*/*", ASSET)
    return true
  }

  private val packsDir: File get() = File(context!!.filesDir, "packs")

  private fun readPacks(): List<JSONObject> {
    val file = File(packsDir, "packs.json")
    if (!file.exists()) return emptyList()
    val arr = JSONObject(file.readText()).optJSONArray("packs") ?: JSONArray()
    return (0 until arr.length()).map { arr.getJSONObject(it) }
  }

  private fun findPack(id: String?) = readPacks().firstOrNull { it.optString("id") == id }

  override fun query(
    uri: Uri,
    projection: Array<out String>?,
    selection: String?,
    selectionArgs: Array<out String>?,
    sortOrder: String?
  ): Cursor {
    return when (matcher.match(uri)) {
      METADATA -> packsCursor(uri, readPacks())
      METADATA_SINGLE -> packsCursor(uri, listOfNotNull(findPack(uri.lastPathSegment)))
      STICKERS -> stickersCursor(uri, findPack(uri.lastPathSegment))
      else -> throw IllegalArgumentException("URI desconhecida: $uri")
    }
  }

  private fun packsCursor(uri: Uri, packs: List<JSONObject>): Cursor {
    val cursor = MatrixCursor(
      arrayOf(
        "sticker_pack_identifier",
        "sticker_pack_name",
        "sticker_pack_publisher",
        "sticker_pack_icon",
        "android_play_store_link",
        "ios_app_download_link",
        "sticker_pack_publisher_email",
        "sticker_pack_publisher_website",
        "sticker_pack_privacy_policy_website",
        "sticker_pack_license_agreement_website",
        "image_data_version",
        "whatsapp_will_not_cache_stickers",
        "animated_sticker_pack"
      )
    )
    for (p in packs) {
      cursor.addRow(
        arrayOf<Any>(
          p.getString("id"),
          p.getString("name"),
          p.getString("publisher"),
          p.getString("tray"),
          "", "", "", "", "", "",
          p.optInt("version", 1).toString(),
          0,
          0
        )
      )
    }
    cursor.setNotificationUri(context!!.contentResolver, uri)
    return cursor
  }

  private fun stickersCursor(uri: Uri, pack: JSONObject?): Cursor {
    val cursor = MatrixCursor(arrayOf("sticker_file_name", "sticker_emoji", "sticker_accessibility_text"))
    val stickers = pack?.optJSONArray("stickers") ?: JSONArray()
    for (i in 0 until stickers.length()) {
      val s = stickers.getJSONObject(i)
      val emojis = s.optJSONArray("emojis") ?: JSONArray()
      val emojiList = (0 until emojis.length()).joinToString(",") { emojis.getString(it) }
      cursor.addRow(arrayOf<Any>(s.getString("file"), emojiList, ""))
    }
    cursor.setNotificationUri(context!!.contentResolver, uri)
    return cursor
  }

  override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor {
    if (matcher.match(uri) != ASSET) throw FileNotFoundException(uri.toString())
    val segments = uri.pathSegments
    val packId = segments[segments.size - 2]
    val fileName = segments[segments.size - 1]
    val pack = findPack(packId) ?: throw FileNotFoundException("Pacote não encontrado: $packId")

    // Só entrega arquivos que pertencem ao pacote (evita acesso a outros arquivos do app).
    val stickers = pack.optJSONArray("stickers") ?: JSONArray()
    val allowed = (0 until stickers.length()).map { stickers.getJSONObject(it).getString("file") } +
      pack.getString("tray")
    if (fileName !in allowed) throw FileNotFoundException("Arquivo não pertence ao pacote: $fileName")

    val file = File(File(packsDir, packId), fileName)
    if (!file.exists()) throw FileNotFoundException(file.path)
    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    return AssetFileDescriptor(pfd, 0, AssetFileDescriptor.UNKNOWN_LENGTH)
  }

  override fun getType(uri: Uri): String? = when (matcher.match(uri)) {
    METADATA -> "vnd.android.cursor.dir/vnd.$authority.metadata"
    METADATA_SINGLE -> "vnd.android.cursor.item/vnd.$authority.metadata"
    STICKERS -> "vnd.android.cursor.dir/vnd.$authority.stickers"
    ASSET -> if (uri.lastPathSegment?.endsWith(".png") == true) "image/png" else "image/webp"
    else -> null
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException()
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException()

  companion object {
    private const val METADATA = 1
    private const val METADATA_SINGLE = 2
    private const val STICKERS = 3
    private const val ASSET = 4
  }
}
