import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("birthday")) {
      componentType = "birthday";
      componentName = "BirthdayCard";
    } else if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "birthday":
        return this.getBirthdayCode();

      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-10 bg-white rounded-3xl shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Message Sent!</h3>
        <p className="mt-2 text-gray-500">Thanks for reaching out. We'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-10 bg-white rounded-3xl shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
        <p className="mt-1 text-sm text-gray-500">We'd love to hear from you. Fill out the form below and we'll respond promptly.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Jane Smith"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="jane@company.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200"
            />
          </div>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
          <textarea
            id="message" name="message" value={formData.message} onChange={handleChange} required rows={4} placeholder="Tell us about your project..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all duration-200"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 px-6 rounded-xl font-semibold text-sm hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const plans = [
  {
    name: "Basic",
    price: "$9",
    period: "/mo",
    description: "Perfect for individuals and small projects",
    features: ["5 projects", "10GB storage", "Basic analytics", "Email support", "API access"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "Best for growing teams and businesses",
    features: ["Unlimited projects", "100GB storage", "Advanced analytics", "Priority support", "API access", "Custom integrations", "Team collaboration"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "For large organizations with custom needs",
    features: ["Everything in Pro", "Unlimited storage", "Dedicated account manager", "SSO & SAML", "Custom contracts", "SLA guarantee", "On-premise option"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PricingCard = ({ plan }) => {
  const { name, price, period, description, features, cta, highlighted } = plan;

  return (
    <div className={\`relative flex flex-col rounded-2xl border \${
      highlighted
        ? "border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105 z-10"
        : "border-gray-200 shadow-lg"
    } bg-white transition-all duration-300 hover:shadow-xl\`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-bold tracking-tight text-gray-900">{price}</span>
          <span className="text-sm font-medium text-gray-500">{period}</span>
        </div>
        <ul className="mt-8 space-y-3 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
              <CheckIcon />
              {feature}
            </li>
          ))}
        </ul>
        <button className={\`mt-8 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 \${
          highlighted
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
            : "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900"
        }\`}>
          {cta}
        </button>
      </div>
    </div>
  );
};

const Card = () => {
  return (
    <section className="py-16 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Simple, transparent pricing</h2>
        <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">Choose the plan that fits your needs. Upgrade or downgrade at any time.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-10 bg-white rounded-3xl shadow-xl">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-500 mb-2">Counter</h2>
      <div className="relative my-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full scale-110 blur-md" />
        <div className="relative w-36 h-36 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
          <span className="text-6xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {count}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setCount(c => c - 1)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 text-2xl font-semibold hover:bg-rose-100 hover:shadow-lg hover:shadow-rose-500/10 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
          aria-label="Decrease count"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-6 h-14 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold hover:bg-gray-200 hover:shadow-lg active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Reset count"
        >
          Reset
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-2xl font-semibold hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          aria-label="Increase count"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getBirthdayCode(): string {
    return `import React, { useState, useEffect } from 'react';

const BirthdayCard = () => {
  const [candles, setCandles] = useState([true, true, true, true, true]);
  const [showConfetti, setShowConfetti] = useState(true);
  const [guestMessages, setGuestMessages] = useState([
    { name: "Alex", message: "Happy Birthday! Wishing you the best! 🎂" },
    { name: "Sam", message: "Party time! Let's celebrate! 🥳" },
  ]);
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [wishes, setWishes] = useState([
    { item: "Nintendo Switch 🎮", checked: false },
    { item: "Art Supply Kit 🎨", checked: false },
    { item: "Concert Tickets 🎵", checked: true },
    { item: "Cozy Blanket 🧶", checked: false },
    { item: "Book Collection 📚", checked: true },
  ]);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 24, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 0; minutes = 0; seconds = 0; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (candles.every(c => !c)) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [candles]);

  const blowCandle = (i) => setCandles(prev => prev.map((c, idx) => idx === i ? false : c));
  const relightCandles = () => setCandles([true, true, true, true, true]);

  const addMessage = () => {
    if (newName.trim() && newMessage.trim()) {
      setGuestMessages(prev => [...prev, { name: newName, message: newMessage }]);
      setNewName("");
      setNewMessage("");
    }
  };

  const toggleWish = (i) => setWishes(prev => prev.map((w, idx) => idx === i ? { ...w, checked: !w.checked } : w));

  const photos = [
    { emoji: "🎈", caption: "Setting up decorations!" },
    { emoji: "🎂", caption: "The amazing cake" },
    { emoji: "🎁", caption: "So many presents!" },
    { emoji: "👯", caption: "Friends together" },
    { emoji: "🎆", caption: "Grand finale!" },
  ];

  const playlist = [
    { title: "Happy Birthday Song", artist: "Classic", duration: "0:32" },
    { title: "Celebration", artist: "Kool & The Gang", duration: "3:41" },
    { title: "Birthday", artist: "The Beatles", duration: "2:42" },
    { title: "In Da Club", artist: "50 Cent", duration: "3:13" },
    { title: "Party in the USA", artist: "Miley Cyrus", duration: "3:22" },
  ];

  const pad = (n) => String(n).padStart(2, "0");
  const confettiEmojis = ["🎊", "🎉", "✨", "⭐", "🎈", "💫", "🌟"];

  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce text-2xl"
          style={{
            left: (Math.random() * 100) + "%",
            top: (Math.random() * 100) + "%",
            animationDelay: (Math.random() * 2) + "s",
            animationDuration: (1 + Math.random() * 2) + "s",
          }}
        >
          {confettiEmojis[i % 7]}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-yellow-100 p-4 sm:p-8">
      {showConfetti && <Confetti />}

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4 animate-bounce">🎂</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 bg-clip-text text-transparent">
            Happy Birthday!
          </h1>
          <p className="text-lg text-purple-600 mt-2 font-medium">🎈 Let's make this day magical! 🎈</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 text-center border border-purple-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-3">⏰ Party Countdown</h2>
          <div className="flex justify-center gap-4">
            {[
              { val: timeLeft.hours, label: "Hours" },
              { val: timeLeft.minutes, label: "Minutes" },
              { val: timeLeft.seconds, label: "Seconds" },
            ].map(({ val, label }) => (
              <div key={label} className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-4 w-24 shadow-lg shadow-purple-500/20">
                <div className="text-3xl font-bold font-mono">{pad(val)}</div>
                <div className="text-xs mt-1 opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 text-center border border-pink-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-pink-400 mb-4">🎂 Blow Out the Candles!</h2>
          <div className="flex justify-center items-end gap-1 mb-4">
            {candles.map((lit, i) => (
              <button
                key={i}
                onClick={() => blowCandle(i)}
                className="flex flex-col items-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <div className={lit ? "text-3xl animate-pulse transition-all duration-300" : "text-3xl opacity-30 scale-90 transition-all duration-300"}>
                  {lit ? "🕯️" : "💨"}
                </div>
              </button>
            ))}
          </div>
          <div className="text-5xl mb-2">🎂</div>
          {candles.every(c => !c) && (
            <div className="space-y-2">
              <p className="text-pink-500 font-bold text-lg animate-bounce">🎉 You blew them all out! Make a wish! 🌟</p>
              <button onClick={relightCandles} className="text-sm text-purple-500 underline hover:text-purple-700 transition-colors">Relight candles</button>
            </div>
          )}
          {candles.some(c => c) && (
            <p className="text-gray-500 text-sm">Click each candle to blow it out! ({candles.filter(c => !c).length}/5 blown)</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-yellow-100">
            <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">📸 Party Memories</h2>
            <div className="bg-gradient-to-br from-yellow-50 to-pink-50 rounded-2xl p-8 text-center mb-3">
              <div className="text-7xl mb-3">{photos[currentPhoto].emoji}</div>
              <p className="text-gray-600 font-medium">{photos[currentPhoto].caption}</p>
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => setCurrentPhoto(p => (p - 1 + photos.length) % photos.length)} className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center hover:bg-yellow-200 transition-colors text-lg font-bold" aria-label="Previous photo">←</button>
              <div className="flex gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setCurrentPhoto(i)} className={i === currentPhoto ? "w-2.5 h-2.5 rounded-full bg-yellow-500 scale-125 transition-all" : "w-2.5 h-2.5 rounded-full bg-yellow-200 transition-all"} />
                ))}
              </div>
              <button onClick={() => setCurrentPhoto(p => (p + 1) % photos.length)} className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center hover:bg-yellow-200 transition-colors text-lg font-bold" aria-label="Next photo">→</button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-green-100">
            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">🎁 Gift Wishlist</h2>
            <ul className="space-y-2">
              {wishes.map((wish, i) => (
                <li key={i}>
                  <button onClick={() => toggleWish(i)} className={wish.checked ? "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left bg-emerald-50 text-emerald-700" : "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left bg-gray-50 hover:bg-gray-100 text-gray-700"}>
                    <span className={wish.checked ? "w-6 h-6 rounded-lg border-2 flex items-center justify-center text-sm transition-all bg-emerald-500 border-emerald-500 text-white" : "w-6 h-6 rounded-lg border-2 flex items-center justify-center text-sm transition-all border-gray-300"}>
                      {wish.checked && "✓"}
                    </span>
                    <span className={wish.checked ? "font-medium line-through opacity-60" : "font-medium"}>{wish.item}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mt-3 text-center">{wishes.filter(w => w.checked).length} of {wishes.length} claimed</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-indigo-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4">🎵 Party Playlist</h2>
          <div className="space-y-2">
            {playlist.map((song, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-indigo-50 transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{song.title}</p>
                  <p className="text-sm text-gray-500">{song.artist}</p>
                </div>
                <span className="text-sm text-gray-400 font-mono">{song.duration}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-rose-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-rose-400 mb-4">📝 Guestbook</h2>
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {guestMessages.map((msg, i) => (
              <div key={i} className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4">
                <p className="font-bold text-rose-600 text-sm">{msg.name}</p>
                <p className="text-gray-600 mt-1">{msg.message}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" className="w-full px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all" />
            <div className="flex gap-2">
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Leave a birthday wish! 🎉" className="flex-1 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all" onKeyDown={(e) => e.key === "Enter" && addMessage()} />
              <button onClick={addMessage} className="px-5 py-2.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-500 hover:to-pink-600 shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Send 💌</button>
            </div>
          </div>
        </div>

        <div className="text-center py-6 text-purple-400 text-sm">
          Made with 💜 for the birthday star ⭐
        </div>
      </div>
    </div>
  );
};

export default BirthdayCard;`;
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "birthday":
        return "Let's make this day magical!";
      case "form":
        return "We'd love to hear from you. Fill out the form below and we'll respond promptly.";
      case "card":
        return "Choose the plan that fits your needs. Upgrade or downgrade at any time.";
      default:
        return "Reset";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "birthday":
        return "It's time to celebrate YOU!";
      case "form":
        return "We'd love to hear from you. Fill out the form and we'll get back within 24 hours.";
      case "card":
        return "Choose the perfect plan for your team. All plans include a 14-day free trial.";
      default:
        return "Reset to 0";
    }
  }

  private getAppCode(componentName: string): string {
    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center p-6">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
