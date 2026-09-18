<script setup lang="ts">
import { computed } from "vue";
import Button from "../ui/Button.vue";
import StatusBadge from "../ui/StatusBadge.vue";
import { downloadTicketImage, type QueueTicketDownloadData } from "../../utils/downloadTicket";

interface Props {
  isOpen: boolean;
  ticket: QueueTicketDownloadData | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

function handlePrint() {
  window.print();
}

function handleDownload() {
  if (props.ticket) {
    downloadTicketImage(props.ticket);
  }
}

const formattedStatus = computed(() => {
  if (!props.ticket?.status) return "Menunggu";
  switch (props.ticket.status) {
    case "in_progress":
      return "Sedang Dilayani";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Dibatalkan";
    case "waiting":
    default:
      return "Menunggu Giliran";
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.isOpen && props.ticket"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:p-0 print:bg-white print:static"
      @click.self="emit('close')"
    >
      <!-- Modal Content Card -->
      <div
        class="printable-ticket-card relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:border-black print:bg-white print:shadow-none print:max-w-none"
      >
        <!-- Pixel Corner Markers (+) -->
        <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-blue-400 select-none pointer-events-none print:hidden">+</span>
        <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-blue-400 select-none pointer-events-none print:hidden">+</span>
        <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-blue-400 select-none pointer-events-none print:hidden">+</span>
        <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-blue-400 select-none pointer-events-none print:hidden">+</span>

        <!-- Header Modal (Non-print dismiss button) -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 print:hidden">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500" />
            <h3 class="text-sm font-semibold text-slate-100">
              Pratinjau Bukti Antrean Pasien
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md"
            @click="emit('close')"
            title="Tutup pratinjau"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Ticket Body -->
        <div class="p-6 sm:p-8 space-y-6">
          
          <!-- Clinic Branding & Title -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-800/80 print:border-black">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base print:border print:border-black print:text-black print:bg-white">
                +
              </div>
              <div>
                <span class="font-bold text-base tracking-tight text-slate-100 print:text-black">
                  Omni<span class="text-blue-400 print:text-black">medix</span> Clinic
                </span>
                <p class="text-[11px] text-slate-400 print:text-black">
                  BUKTI RESMI PENDAFTARAN ANTREAN
                </p>
              </div>
            </div>

            <div class="text-right">
              <span class="font-mono text-xs text-blue-400 font-semibold print:text-black">
                RAWAT JALAN
              </span>
              <p class="text-[10px] text-slate-500 print:text-black">
                {{ props.ticket.queueDate }}
              </p>
            </div>
          </div>

          <!-- Big Numbers Display -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <!-- Box Nomor Antrean -->
            <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-5 print:border-black print:bg-white">
              <span class="text-[11px] uppercase font-semibold text-slate-400 tracking-wider print:text-black">
                Nomor Antrean
              </span>
              <div class="text-4xl sm:text-5xl font-mono font-extrabold text-blue-400 tracking-tight my-1.5 print:text-black">
                {{ props.ticket.queueNumber }}
              </div>
              <span class="text-xs font-medium text-slate-300 print:text-black">
                {{ props.ticket.poliName }}
              </span>
            </div>

            <!-- Box Kode Booking -->
            <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-5 print:border-black print:bg-white">
              <span class="text-[11px] uppercase font-semibold text-slate-400 tracking-wider print:text-black">
                Kode Booking Unik
              </span>
              <div class="text-2xl sm:text-3xl font-mono font-bold text-slate-100 tracking-widest my-2 bg-slate-900/80 py-1 rounded-lg border border-slate-800 print:border-black print:text-black print:bg-white">
                {{ props.ticket.bookingCode }}
              </div>
              <div class="inline-flex items-center gap-1.5 text-xs text-emerald-400 print:text-black">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 print:bg-black" />
                <span>{{ formattedStatus }}</span>
              </div>
            </div>
          </div>

          <!-- Key Details Table -->
          <div class="divide-y divide-slate-800/80 border-t border-b border-slate-800/80 text-xs py-1 print:divide-black print:border-black">
            <div class="py-2.5 flex justify-between items-center">
              <span class="text-slate-400 print:text-black">Nama Pasien</span>
              <span class="font-semibold text-slate-100 print:text-black">{{ props.ticket.patientName }}</span>
            </div>
            <div class="py-2.5 flex justify-between items-center">
              <span class="text-slate-400 print:text-black">Poliklinik Tujuan</span>
              <span class="font-semibold text-slate-100 print:text-black">{{ props.ticket.poliName }}</span>
            </div>
            <div class="py-2.5 flex justify-between items-center">
              <span class="text-slate-400 print:text-black">Dokter Spesialis</span>
              <span class="font-semibold text-slate-100 print:text-black">{{ props.ticket.doctorName }}</span>
            </div>
            <div class="py-2.5 flex justify-between items-center">
              <span class="text-slate-400 print:text-black">Estimasi Waktu Giliran</span>
              <span class="font-semibold text-amber-400 print:text-black">{{ props.ticket.estimasi || '± 10 menit' }}</span>
            </div>
          </div>

          <!-- Petunjuk Kunjungan -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1.5 print:border-black print:bg-white print:text-black">
            <div class="flex items-center gap-1.5 font-semibold text-slate-200 print:text-black">
              <span>💡</span>
              <span>Petunjuk Kunjungan Rumah Sakit</span>
            </div>
            <p class="leading-relaxed text-[11px]">
              1. Harap tiba di ruang tunggu poliklinik 15 menit sebelum estimasi waktu pemeriksaan.
            </p>
            <p class="leading-relaxed text-[11px]">
              2. Tunjukkan kode booking atau nomor antrean ini kepada petugas medis saat dipanggil.
            </p>
          </div>

          <!-- Micro Technical Footer -->
          <div class="text-center font-mono text-[10px] text-slate-500 pt-1 print:text-black">
            [ OMNIMEDIX DIGITAL HEALTH // PASS ID: {{ props.ticket.bookingCode }} ]
          </div>
        </div>

        <!-- Modal Action Footer (Print, Download, Close) -->
        <div class="bg-slate-950/60 border-t border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="emit('close')"
          >
            Tutup
          </Button>

          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              class="w-full sm:w-auto"
              @click="handleDownload"
            >
              <svg class="w-4 h-4 mr-1.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Unduh Bukti (PNG)
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              class="w-full sm:w-auto"
              @click="handlePrint"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak / Simpan PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
