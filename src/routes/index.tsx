import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "HomeStory — Every home has a story." }],
  }),
  component: LandingPage,
});

const STEPS = [
  {
    numeral: "One",
    title: "Find your home",
    body: "Search your address and the building fills itself in from the official EPC register — floor area, energy rating, walls, roof, windows, and the build era where the certificate carries one. What no register holds, you type yourself. Nothing is invented on your behalf.",
  },
  {
    numeral: "Two",
    title: "Write its chapter",
    body: "Add what you know of the house — the extension, the family who planted the apple tree, the name on the old deeds. Rough notes are enough; Claude AI can help shape them into a narrative you are happy to sign.",
  },
  {
    numeral: "Three",
    title: "Mount the plaque",
    body: "A brass plaque, engraved with the home’s QR code, is made to order. No workshop is connected yet, so a plaque cannot be made or posted — you can reserve one, and nothing is charged. Anyone at your door scans it and reads the story on their phone. No app, no account, no download.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "£0",
    note: "Basic page and a standard QR code.",
  },
  {
    name: "Premium",
    price: "£24.99",
    note: "One-time, for the house. Adds Story Polish and Ask Your House — the two Claude AI features — and stays with the home when it changes hands.",
  },
  {
    name: "Brass plaque",
    price: "£34.99",
    note: "Made to order. No workshop is connected yet, so a plaque cannot be made or posted — you can reserve one.",
  },
  {
    name: "Estate agent",
    price: "£9.99 / month",
    note: "Per agent. Every listing carries the history of the house.",
  },
];

const SAMPLE_SECTIONS = [
  {
    title: "The house",
    body: "Floor area, energy rating, walls, roof and windows, taken from the official EPC register and dated to its certificate. Where the register is wrong, the owner corrects it and the correction is theirs.",
  },
  {
    title: "The two AI tools",
    body: "Ask Your House answers a visitor’s question from what the page records. Story Polish shapes your rough notes into a chapter you are happy to sign. Both are Claude AI, and both are Premium.",
  },
  {
    title: "The owner’s chapter",
    body: "The part no register holds: the extension, the tree by the gate, the family who lived here before. Written by the people in the house, and passed on with it.",
  },
];

function LandingPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="hs-wrap pt-10 pb-12 md:pt-24 md:pb-20">
        <div className="flex flex-col gap-9 md:grid md:grid-cols-12 md:items-center md:gap-14">
          <div className="aspect-[4/3] overflow-hidden md:order-2 md:col-span-5 md:aspect-[3/4]">
            <img
              src="/images/hero-house.jpg"
              alt="A Victorian brick terrace house at golden hour, its bay window and dark green front door catching the low sun, with the street running away behind it."
              className="h-full w-full object-cover object-center"
              decoding="async"
            />
          </div>

          <div className="md:order-1 md:col-span-7">
            <p className="hs-label">A permanent history page for a home</p>
            <h1 className="hs-display mt-5 max-w-[16ch]">
              Every home has a story.
            </h1>
            <p className="hs-lede mt-6 max-w-[54ch]">
              A brass plaque beside the front door. A permanent page for the
              house — the official building record, the chapter you write
              yourself, and two Claude AI tools for the parts in between. When
              the house changes hands, the story passes with it.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/start" className="hs-btn hs-btn-brass">
                Start your home’s page
              </a>
              <a href="#example" className="hs-btn hs-btn-ink">
                See an example page
              </a>
            </div>
            <p className="hs-caption mt-7 max-w-[48ch]">
              Most visitors arrive by scanning the plaque at the door, on a
              phone. There is nothing to install.
            </p>
          </div>
        </div>
      </section>

      <hr className="hs-rule-brass" />

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="hs-section hs-wrap">
        <p className="hs-label">How it works</p>
        <h2 className="hs-h2 mt-4 max-w-[24ch]">
          Three steps, and the house keeps its history.
        </h2>

        <div className="mt-10 grid gap-0 md:mt-14 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`py-7 md:py-0 ${
                i === 0 ? "" : "border-t border-hs-rule md:border-t-0"
              }`}
            >
              <p className="hs-numeral">{step.numeral}</p>
              <h3 className="hs-h3 mt-3">{step.title}</h3>
              <p className="hs-body mt-3 max-w-[38ch]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plaque band ────────────────────────────────────────────── */}
      <div className="h-[240px] w-full overflow-hidden md:h-[420px] lg:h-[480px]">
        <img
          src="/images/plaque-door.jpg"
          alt="A brushed brass plaque engraved with a QR code, mounted on the rendered wall beside a dark green front door."
          className="h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      </div>

      <hr className="hs-rule" />

      {/* ── Example page preview ───────────────────────────────────── */}
      <section id="example" className="hs-section hs-wrap">
        <p className="hs-label">The example page</p>
        <h2 className="hs-h2 mt-4 max-w-[24ch]">
          What a visitor finds at the door.
        </h2>
        <p className="hs-body mt-4 max-w-[52ch]">
          A specimen of the page — the layout, not a real house. No address,
          owner or record below is a claim about an actual home.
        </p>

        <div className="mt-10 border border-hs-rule bg-hs-surface md:mt-12">
          <div className="flex flex-col gap-1 border-b border-hs-rule-brass px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="hs-label">Example page</p>
            <p className="hs-caption">
              Specimen layout — not a real home’s history.
            </p>
          </div>

          <div className="grid gap-8 px-5 py-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-stretch md:gap-10 md:px-10 md:py-10">
            <div className="aspect-[4/3] overflow-hidden sm:aspect-[16/10] md:aspect-auto md:h-full md:min-h-[26rem]">
              <img
                src="/images/interior-bay.jpg"
                alt="A sitting room in a period house: a cushioned window seat in a tall bay window, built-in shelves of clothbound books, and an armchair beside an open fireplace."
                className="h-full w-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div>
              <p className="font-display text-2xl italic text-hs-muted md:text-3xl">
                Your address, here
              </p>
              <p className="hs-caption mt-2">
                The page lives at a permanent web address that never changes.
              </p>

              <hr className="hs-rule mt-8" />

              <div className="mt-8 grid gap-7 sm:grid-cols-2 md:grid-cols-1 md:gap-6">
                {SAMPLE_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h3 className="hs-h3">{section.title}</h3>
                    <p className="hs-body mt-2">{section.body}</p>
                  </div>
                ))}
              </div>

              <hr className="hs-rule mt-8" />

              <div className="mt-8">
                <p className="hs-label">Ask your house</p>
                <div className="mt-3 flex items-center justify-between gap-4 border border-hs-rule px-4 py-3">
                  <p className="font-body text-sm italic text-hs-muted">
                    When was the kitchen extended?
                  </p>
                  <span className="hs-caption shrink-0" aria-hidden="true">
                    →
                  </span>
                </div>
                <p className="hs-caption mt-3 max-w-[48ch]">
                  It answers only from what the page records, and says so
                  plainly when the page does not record something.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-hs-rule px-5 py-4 md:px-10">
            <p className="hs-caption">
              History narratives powered by Claude AI.
            </p>
          </div>
        </div>
      </section>

      <hr className="hs-rule" />

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="hs-section hs-wrap">
        <p className="hs-label">Pricing</p>
        <h2 className="hs-h2 mt-4 max-w-[24ch]">
          Pay once for the house. Not by the month.
        </h2>

        <div className="mt-10 md:mt-14">
          {PRICING.map((item, i) => (
            <div
              key={item.name}
              className={`flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 ${
                i === 0 ? "border-t border-hs-rule" : ""
              } border-b border-hs-rule`}
            >
              <div className="sm:max-w-[42ch]">
                <h3 className="hs-h3">{item.name}</h3>
                <p className="hs-body mt-1">{item.note}</p>
              </div>
              <p className="font-display text-2xl whitespace-nowrap sm:text-right">
                {item.price}
              </p>
            </div>
          ))}
        </div>

        <p className="hs-caption mt-6 max-w-[54ch]">
          These are planned prices. HomeStory is not taking payments yet, so
          nothing has been charged and no plaque has been made or posted.
        </p>
      </section>

      <hr className="hs-rule-brass" />

      {/* ── Closing ────────────────────────────────────────────────── */}
      <section className="hs-section hs-wrap">
        <h2 className="hs-h2 max-w-[26ch]">
          A house remembers more than its owners do.
        </h2>
        <p className="hs-body mt-4 max-w-[50ch]">
          HomeStory gives that memory somewhere to live — carried by the
          building itself, from one household to the next.
        </p>
      </section>
    </>
  );
}
