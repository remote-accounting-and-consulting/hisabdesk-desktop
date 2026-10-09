export default function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800">
      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-brand-600 font-bold text-5xl">H</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-wide">HisabDesk</h1>
        <p className="text-brand-100 text-sm mt-2">Accounting & Consulting Management</p>
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-brand-200 text-[11px] mt-8">Remote Accounting and Consulting Pvt. Ltd.</p>
      </div>
    </div>
  );
}
