package expo.modules.whatsappstickers

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ADD_PACK_REQUEST = 200
private val WHATSAPP_PACKAGES = listOf("com.whatsapp", "com.whatsapp.w4b")

class WhatsappStickersModule : Module() {
  private fun installedWhatsApps(): List<String> {
    val pm = appContext.reactContext?.packageManager ?: return emptyList()
    return WHATSAPP_PACKAGES.filter {
      try {
        pm.getPackageInfo(it, 0)
        true
      } catch (_: PackageManager.NameNotFoundException) {
        false
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("WhatsappStickers")

    Events("onAddResult")

    Function("isWhatsAppInstalled") {
      installedWhatsApps().isNotEmpty()
    }

    AsyncFunction("addStickerPack") { packId: String, packName: String ->
      val activity = appContext.currentActivity
        ?: throw CodedException("NO_ACTIVITY", "App não está em primeiro plano", null)
      val target = installedWhatsApps().firstOrNull()
        ?: throw CodedException("NO_WHATSAPP", "WhatsApp não está instalado", null)

      val intent = Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK").apply {
        putExtra("sticker_pack_id", packId)
        putExtra("sticker_pack_authority", activity.packageName + ".stickercontentprovider")
        putExtra("sticker_pack_name", packName)
        setPackage(target)
      }
      activity.startActivityForResult(intent, ADD_PACK_REQUEST)
    }.runOnQueue(Queues.MAIN)

    // O WhatsApp devolve se deu certo e, se não, o motivo (validation_error).
    OnActivityResult { _, payload ->
      if (payload.requestCode != ADD_PACK_REQUEST) return@OnActivityResult
      sendEvent(
        "onAddResult",
        mapOf(
          "ok" to (payload.resultCode == Activity.RESULT_OK),
          "error" to payload.data?.getStringExtra("validation_error")
        )
      )
    }
  }
}
