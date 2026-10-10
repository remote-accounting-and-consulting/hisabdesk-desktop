export default function Splash() {
  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-gradient-to-br from-brand-600 to-brand-800
        dark:bg-none dark:bg-slate-900
        transition-colors
      "
    >
      <div className="text-center">
        {/* Logo — same as sidebar */}
        <div
          className="
            w-24 h-24 rounded-3xl shadow-2xl mx-auto mb-6
            bg-white dark:bg-brand-600
            flex items-center justify-center
            animate-pulse
          "
        >
          <span
            className="
              font-bold text-4xl
              text-brand-600 dark:text-white
            "
          >
            HD
          </span>
        </div>

        {/* App name */}
        <h1
          className="
            text-3xl font-bold tracking-wide
            text-white
            dark:text-white
          "
        >
          HisabDesk
        </h1>

        {/* Tagline */}
        <p
          className="
            text-sm mt-2
            text-brand-100
            dark:text-gray-400
          "
        >
          Accounting & Consulting Management
        </p>

        {/* Spinner */}
        <div className="mt-8 flex justify-center">
          <div
            className="
              w-8 h-8 rounded-full animate-spin
              border-3
              border-white/30 border-t-white
              dark:border-slate-600 dark:border-t-brand-500
            "
          />
        </div>

        {/* Company */}
        <p
          className="
            text-[11px] mt-8
            text-brand-200
            dark:text-gray-500
          "
        >
          Remote Accounting and Consulting Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
