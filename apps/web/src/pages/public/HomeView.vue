<script setup lang="ts">
import { ref } from "vue";
import Button from "../../components/ui/Button.vue";

// Status operasional poliklinik terintegrasi
const isSystemActive = ref(true);
</script>

<template>
  <div class="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden">
    <!-- Subtle Pixel Background Grid Pattern with Radial Falloff -->
    <div
      class="absolute inset-0 pointer-events-none z-0 opacity-40 [background-image:radial-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_30%,transparent_90%)]"
      aria-hidden="true"
    />

    <!-- Ambient Subtle Glow at Top Center -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[340px] bg-blue-600/10 blur-[130px] pointer-events-none rounded-full"
      aria-hidden="true"
    />

    <!-- Main Content Container with Generous Calm Spacing -->
    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 flex flex-col items-center">
      
      <!-- Top Meta Pill with Subtle Pixel Ornament -->
      <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 backdrop-blur-sm shadow-sm mb-8 transition-all hover:border-slate-700">
        <!-- 8-bit / Pixelated Micro Icon -->
        <span class="flex items-center text-blue-400 select-none">
          <svg class="w-3.5 h-3.5" viewBox="0 0 10 10" fill="currentColor">
            <rect x="4" y="1" width="2" height="8" />
            <rect x="1" y="4" width="8" height="2" />
          </svg>
        </span>
        <span class="font-mono text-[11px] text-slate-400 tracking-wider uppercase">OmniMedix Core</span>
        <span class="w-1 h-1 rounded-full bg-slate-700" />
        <span class="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Layanan Antrean Aktif
        </span>
      </div>

      <!-- Hero Typography Section -->
      <div class="text-center max-w-3xl space-y-5">
        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.12]">
          Layanan Rawat Jalan
          <span class="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
            Lebih Tertib & Presisi
          </span>
        </h1>

        <p class="text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-xl mx-auto">
          Daftar antrean poliklinik secara mandiri, pantau panggilan periksa dokter, dan lacak kesiapan e-resep farmasi tanpa menunggu di lorong klinik.
        </p>

        <!-- Call-to-Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <!-- Primary CTA: Booking -->
          <router-link to="/booking" class="w-full sm:w-auto">
            <Button
              size="lg"
              variant="primary"
              class="w-full sm:w-auto group relative overflow-hidden px-7 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
            >
              <span class="font-medium">Ambil Nomor Antrean</span>
              <!-- Pixelated Arrow Icon -->
              <svg class="w-3.5 h-3.5 ml-2.5 transition-transform duration-150 group-hover:translate-x-1" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1" y="4" width="6" height="2" />
                <rect x="5" y="2" width="2" height="2" />
                <rect x="7" y="3" width="2" height="4" />
                <rect x="5" y="6" width="2" height="2" />
              </svg>
            </Button>
          </router-link>

          <!-- Secondary CTA: Track Queue -->
          <router-link to="/track-queue" class="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              class="w-full sm:w-auto px-6 border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100"
            >
              <span>Lacak Antrean & Resep</span>
            </Button>
          </router-link>
        </div>
      </div>

      <!-- 3 Key Information Cards with Refined Pixel Corner Accents -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-20 sm:mt-24">
        
        <!-- Card 1: Booking Antrean -->
        <div class="relative group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-200">
          <!-- Pixel Corner Markers (+) -->
          <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-blue-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-blue-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-blue-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-blue-400 select-none pointer-events-none transition-colors">+</span>

          <!-- Header / Tag -->
          <div class="flex items-center justify-between mb-4">
            <span class="font-mono text-xs text-blue-400/90 tracking-wider">
              [ 01 // REGISTRASI ]
            </span>
            <div class="w-2 h-2 bg-blue-500/60 rounded-xs" />
          </div>

          <h2 class="text-lg font-semibold text-slate-100 mb-2 tracking-tight">
            Booking Antrean Mandiri
          </h2>
          
          <p class="text-sm text-slate-400 leading-relaxed mb-6">
            Pilih poliklinik spesialis dan jadwal dokter dalam hitungan detik. Dapatkan kode tiket antrean instan tanpa berkas fisik.
          </p>

          <router-link
            to="/booking"
            class="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors group/link"
          >
            <span>Daftar Sekarang</span>
            <span class="ml-1.5 transition-transform group-hover/link:translate-x-1">→</span>
          </router-link>
        </div>

        <!-- Card 2: Lacak Antrean Live -->
        <div class="relative group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/90 hover:border-teal-500/50 rounded-xl p-6 transition-all duration-200">
          <!-- Pixel Corner Markers (+) -->
          <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-teal-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-teal-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-teal-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-teal-400 select-none pointer-events-none transition-colors">+</span>

          <!-- Header / Tag -->
          <div class="flex items-center justify-between mb-4">
            <span class="font-mono text-xs text-teal-400/90 tracking-wider">
              [ 02 // MONITOR ]
            </span>
            <div class="w-2 h-2 bg-teal-500/60 rounded-xs" />
          </div>

          <h2 class="text-lg font-semibold text-slate-100 mb-2 tracking-tight">
            Pantau Giliran & Obat
          </h2>
          
          <p class="text-sm text-slate-400 leading-relaxed mb-6">
            Lacak nomor antrean yang sedang diperiksa di ruang dokter serta progres peracikan obat di unit farmasi secara real-time.
          </p>

          <router-link
            to="/track-queue"
            class="inline-flex items-center text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors group/link"
          >
            <span>Cek Status Antrean</span>
            <span class="ml-1.5 transition-transform group-hover/link:translate-x-1">→</span>
          </router-link>
        </div>

        <!-- Card 3: Keunggulan Terintegrasi -->
        <div class="relative group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl p-6 transition-all duration-200">
          <!-- Pixel Corner Markers (+) -->
          <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-indigo-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-indigo-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-slate-600 group-hover:text-indigo-400 select-none pointer-events-none transition-colors">+</span>
          <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-slate-600 group-hover:text-indigo-400 select-none pointer-events-none transition-colors">+</span>

          <!-- Header / Tag -->
          <div class="flex items-center justify-between mb-4">
            <span class="font-mono text-xs text-indigo-400/90 tracking-wider">
              [ 03 // INTEGRASI ]
            </span>
            <div class="w-2 h-2 bg-indigo-500/60 rounded-xs" />
          </div>

          <h2 class="text-lg font-semibold text-slate-100 mb-2 tracking-tight">
            Sinkronisasi Langsung
          </h2>
          
          <p class="text-sm text-slate-400 leading-relaxed mb-6">
            Pendaftaran terhubung langsung ke konsol dokter, diagnosis, dan resep farmasi tanpa penumpukan berkas dan proses berbelit.
          </p>

          <div class="inline-flex items-center text-xs font-mono text-slate-400">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2" />
            <span>Terhubung &middot; Paperless</span>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

