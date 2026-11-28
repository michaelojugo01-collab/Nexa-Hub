package expo.modules.smsretriever

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * Wraps Google's SMS Retriever API. Zero-tap: the system hands us the one SMS that ends with
 * this app's 11-character hash, for up to 5 minutes after `start()`. No READ_SMS permission.
 * The backend must append the hash (see `getAppHash()`) to every OTP SMS.
 */
class SmsRetrieverModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("SmsRetriever")

    Events("onSmsReceived", "onTimeout")

    AsyncFunction("start") { promise: Promise ->
      unregister()
      val ctx = context
      receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
          if (intent?.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
          val extras = intent.extras ?: return
          val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return
          when (status.statusCode) {
            CommonStatusCodes.SUCCESS -> {
              val message = extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE) ?: ""
              sendEvent("onSmsReceived", mapOf("message" to message))
            }
            CommonStatusCodes.TIMEOUT -> sendEvent("onTimeout", emptyMap<String, Any>())
          }
          unregister()
        }
      }
      ContextCompat.registerReceiver(
        ctx,
        receiver,
        IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
        SmsRetriever.SEND_PERMISSION,
        null,
        ContextCompat.RECEIVER_EXPORTED
      )
      SmsRetriever.getClient(ctx).startSmsRetriever()
        .addOnSuccessListener { promise.resolve(true) }
        .addOnFailureListener { e ->
          unregister()
          promise.reject("ERR_SMS_RETRIEVER", e.message ?: "Could not start SMS Retriever", e)
        }
    }

    Function("stop") {
      unregister()
    }

    /** The 11-character hash the backend must put at the end of OTP messages. */
    Function("getAppHash") {
      appHash(context)
    }

    OnDestroy {
      unregister()
    }
  }

  private fun unregister() {
    receiver?.let {
      try {
        context.unregisterReceiver(it)
      } catch (_: Exception) {
      }
    }
    receiver = null
  }

  @Suppress("DEPRECATION")
  private fun appHash(ctx: Context): String? {
    return try {
      val packageName = ctx.packageName
      val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        ctx.packageManager
          .getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
          .signingInfo
          ?.apkContentsSigners
      } else {
        ctx.packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES).signatures
      }
      val signature = signatures?.firstOrNull()?.toCharsString() ?: return null
      val digest = MessageDigest.getInstance("SHA-256")
      digest.update("$packageName $signature".toByteArray(StandardCharsets.UTF_8))
      val hash = digest.digest().copyOfRange(0, 9)
      Base64.encodeToString(hash, Base64.NO_PADDING or Base64.NO_WRAP).substring(0, 11)
    } catch (_: Exception) {
      null
    }
  }
}
