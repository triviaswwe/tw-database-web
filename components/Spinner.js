// components/Spinner.js

export default function Spinner() {
  return (
    <div className="flex justify-center items-center py-6">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
