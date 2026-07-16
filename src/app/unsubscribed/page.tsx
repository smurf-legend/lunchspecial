import Link from "next/link";

export default function UnsubscribedPage() {
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
      <h1 className="text-xl font-bold mb-2">You're unsubscribed</h1>
      <p className="text-gray-600 text-sm">
        You won't get any more deals emails from us. Changed your mind? You can turn them back on
        anytime from your{" "}
        <Link href="/profile" className="text-orange-600 underline">
          profile
        </Link>
        .
      </p>
    </div>
  );
}
