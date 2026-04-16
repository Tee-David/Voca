"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GridMotion from "@/components/ui/GridMotion";
import TextType from "@/components/ui/TextType";

// Book & reading themed images from Unsplash
const BOOK_IMAGES = [
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519682577862-22b62b24e493?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1588580000645-4562a6d2c839?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1476275466078-4cdc71f21ebe?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b6375?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1471970471555-19d4b113e9ed?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=400&h=260&fit=crop&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=260&fit=crop&q=80",
];

const READING_QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "Not all readers are leaders, but all leaders are readers.", author: "Harry S. Truman" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "Once you learn to read, you will be forever free.", author: "Frederick Douglass" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "A book is a dream that you hold in your hands.", author: "Neil Gaiman" },
  { text: "The only thing you absolutely have to know is the location of the library.", author: "Albert Einstein" },
  { text: "Books are mirrors of the soul.", author: "Virginia Woolf" },
  { text: "In books I have traveled, not only to other worlds, but into my own.", author: "Anna Quindlen" },
  { text: "Reading gives us someplace to go when we have to stay where we are.", author: "Mason Cooley" },
  { text: "One must always be careful of books, and what is inside them, for words have the power to change us.", author: "Cassandra Clare" },
  { text: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire" },
  { text: "It is what you read when you don't have to that determines what you will be when you can't help it.", author: "Oscar Wilde" },
  { text: "Knowledge is the eye of desire and can become the pilot of the soul.", author: "Will Durant" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Invest in yourself. Your career is the engine of your wealth.", author: "Paul Clitheroe" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];

export function VocaVisualPanel() {
  const [quotes, setQuotes] = useState<{ text: string; author: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const shuffled = [...READING_QUOTES].sort(() => 0.5 - Math.random());
    setQuotes(shuffled.slice(0, 5));
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [quotes.length, currentIndex]);

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  const paginate = (dir: number) => {
    if (quotes.length === 0) return;
    let next = currentIndex + dir;
    if (next < 0) next = quotes.length - 1;
    else if (next >= quotes.length) next = 0;
    setCurrentIndex(next);
  };

  return (
    <div className="relative hidden lg:flex overflow-hidden rounded-3xl m-4 bg-[#0d0b1a] flex-col flex-1 min-h-[calc(100vh-32px)]">

      {/* Background: GridMotion book images + purple overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <GridMotion items={BOOK_IMAGES} gradientColor="#0d0b1a" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(26,5,51,0.93) 0%, rgba(108,99,255,0.72) 50%, rgba(13,11,26,0.93) 100%)",
          }}
        />
      </div>

      {/* Subtle dark overlay */}
      <div className="absolute inset-0 z-0 bg-black/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6 lg:p-8 pointer-events-none min-h-full">

        {/* Logo + tagline */}
        <div className="flex flex-col pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#6C63FF] flex items-center justify-center shadow-lg shadow-[#6C63FF]/40">
              <span className="text-xl font-black text-white">V</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Voca</span>
          </div>

          <h2 className="text-3xl lg:text-4xl xl:text-5xl tracking-tight font-extrabold text-white mt-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] leading-tight max-w-[90%]">
            Your documents.<br />Listening made simple.
          </h2>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[20px]" />

        {/* Rotating quotes */}
        <div className="flex flex-col gap-4 mt-4">
          <div
            className="w-full relative pointer-events-auto overflow-hidden items-start text-left shrink-0 rounded-2xl border border-white/10 p-8 flex flex-col justify-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              boxShadow: "0 8px 32px 0 rgba(0,0,0,0.4)",
            }}
          >
            <div className="min-h-[110px] flex flex-col justify-center w-full items-start">
              <AnimatePresence mode="wait">
                {quotes.length > 0 && (
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full pb-2 text-left cursor-grab active:cursor-grabbing"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(_, { offset, velocity }) => {
                      const swipe = swipePower(offset.x, velocity.x);
                      if (swipe < -swipeConfidenceThreshold) paginate(1);
                      else if (swipe > swipeConfidenceThreshold) paginate(-1);
                    }}
                  >
                    <TextType
                      text={`\u201C${quotes[currentIndex].text}\u201D`}
                      typingSpeed={30}
                      showCursor={false}
                      loop={false}
                      className="text-lg xl:text-xl text-white leading-snug font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] line-clamp-3 overflow-hidden"
                    />
                    <p className="text-[#a89fff] font-medium mt-4 text-sm tracking-wide uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      — {quotes[currentIndex].author}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-start gap-2 mt-4 h-4 pointer-events-auto z-20 w-full shrink-0">
              {quotes.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-8 bg-[#6C63FF]"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to quote ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pointer-events-auto shrink-0 pb-2">
            <p className="text-xs font-medium text-white/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              &copy; {new Date().getFullYear()} Voca &mdash; Listen to what matters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
