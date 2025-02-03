import FlashierHero from "@/components/hero";

export default async function Home() {
  return (
    <>
      <FlashierHero />
      <div className="w-full max-w-5xl mx-auto px-5 mt-16">
        <h2 className="font-medium text-xl mb-4 text-foreground">Next steps</h2>
        {/* Add your next steps content here */}
      </div>
    </>
  )
}

