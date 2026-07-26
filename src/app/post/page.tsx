import Link from "next/link";

export default function PostChoicePage() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Got a special to add?</h1>
        <p className="text-sm text-gray-500 mt-1">Pick whichever's easier for you.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg border flex flex-col gap-3">
          <div>
            <h2 className="font-bold text-lg">Post it yourself</h2>
            <p className="text-sm text-gray-500 mt-1">
              Full control over the listing — price, days, photo, all of it. Takes a couple of
              minutes. Needs an account so you can edit or take it down later.
            </p>
          </div>
          <Link
            href="/specials/new"
            className="mt-auto bg-orange-600 text-white text-center font-medium px-4 py-2 rounded hover:bg-orange-700"
          >
            Post a Special
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border flex flex-col gap-3">
          <div>
            <h2 className="font-bold text-lg">Just send it in</h2>
            <p className="text-sm text-gray-500 mt-1">
              No account needed. Tell us what you know — even just a link and a photo — and
              we'll turn it into a listing for you.
            </p>
          </div>
          <Link
            href="/suggest"
            className="mt-auto bg-white border-2 border-orange-600 text-orange-600 text-center font-medium px-4 py-2 rounded hover:bg-orange-50"
          >
            Suggest a Special
          </Link>
        </div>
      </div>
    </div>
  );
}
