package com.flash.movie

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tv = TextView(this).apply {
            text = "Flâsh Movie Pro is Ready!"
            textSize = 24f
            gravity = android.view.Gravity.CENTER
        }
        setContentView(tv)
    }
}
