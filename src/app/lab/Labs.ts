import type { DemoName } from "@/experiments/Demos";

export const LAB_DESCRIPTION = "Small interface ideas, worked on in the open until they feel right.";

// One take on the lab's idea, shown in its own section (linked as #id)
type Experiment = {
  id: string;
  demo: DemoName;
  title: string;
  description: string;
  // The idea behind it, under the demo
  note: string;
};

export type Lab = {
  slug: string;
  title: string;
  // The page's title for search engines and link previews, in the words people
  // would look for it by
  pageTitle: string;
  // One sentence: shown under the title, and as the page's description for
  // search engines and link previews
  description: string;
  // On the lab's index, its cover plays them all in turn
  experiments: Experiment[];
};

// Each lab has its own page at /lab/[slug], and a card on /lab
export const LABS: Lab[] = [
  {
    slug: "hold-to-confirm",
    title: "Hold to confirm",
    pageTitle: "Hold to confirm button ideas",
    description: "Interface ideas for a button you press and hold to confirm.",
    experiments: [
      {
        id: "classic",
        demo: "hold-classic",
        title: "Classic",
        description: "A fill sweeps across while you hold, and pulls back when you let go.",
        note: "The familiar pattern, done carefully: what you see and what happens never drift apart, and changing your mind is instant.",
      },
      {
        id: "into-the-bin",
        demo: "hold-into-the-bin",
        title: "Into the bin",
        description: "The trash icon leaves the button, takes the file away, and comes back.",
        note: "The icon stops being decoration and does the deleting.",
      },
      {
        id: "dissolve",
        demo: "hold-dissolve",
        title: "Dissolve",
        description: "The picture turns to dust as you hold, and gathers back if you let go.",
        note: "Deleting you can watch, and undo halfway.",
      },
      {
        id: "burn",
        demo: "hold-burn",
        title: "Burn",
        description: "The picture burns away from the bottom up as you hold.",
        note: "Making the point of no return feel like one.",
      },
      {
        id: "shred",
        demo: "hold-shred",
        title: "Shred",
        description: "The picture is fed through a slot and comes out in strips.",
        note: "A physical metaphor for a digital action.",
      },
      {
        id: "fold",
        demo: "hold-fold",
        title: "Fold",
        description: "The picture folds in half, then again, and drops away.",
        note: "Putting something away, rather than destroying it.",
      },
      {
        id: "point-of-no-return",
        demo: "hold-point-of-no-return",
        title: "Point of no return",
        description: "Past a point, the button commits, and letting go confirms.",
        note: "A hold with a moment of decision in it.",
      },
      {
        id: "from-your-finger",
        demo: "hold-from-your-finger",
        title: "From your finger",
        description: "The fill grows from wherever you pressed.",
        note: "The button answers your touch, not a fixed edge.",
      },
      {
        id: "building-tension",
        demo: "hold-building-tension",
        title: "Building tension",
        description: "The button squeezes, darkens and trembles as you hold.",
        note: "The end feels like a release of pressure.",
      },
      {
        id: "undo-window",
        demo: "hold-undo-window",
        title: "Undo window",
        description: "It deletes at once, then gives you a moment to take it back.",
        note: "Acting first and leaving a way back, instead of asking twice.",
      },
      {
        id: "adaptive",
        demo: "hold-adaptive",
        title: "Adaptive",
        description: "The hold gets shorter as you use it, and longer when you hesitate.",
        note: "A safeguard that learns how sure you are.",
      },
    ],
  },
  {
    slug: "skeleton",
    title: "Skeleton",
    pageTitle: "Skeleton loading ideas",
    description: "Interface ideas for a placeholder giving way to content.",
    experiments: [
      {
        id: "frost",
        demo: "skeleton-frost",
        title: "Frost",
        description: "The placeholder is the post behind frosted glass; when it loads, the glass clears.",
        note: "Something there, not yet in focus.",
      },
      {
        id: "dust",
        demo: "skeleton-dust",
        title: "Dust",
        description: "The placeholder is fine dust, carried into the content when it arrives.",
        note: "The grey becomes the content, rather than making way for it.",
      },
      {
        id: "denoise",
        demo: "skeleton-denoise",
        title: "Denoise",
        description: "The content is generated out of noise, the way an image model makes a picture.",
        note: "Loading as making, not filling in.",
      },
      {
        id: "pencil",
        demo: "skeleton-pencil",
        title: "Pencil",
        description: "A pencil sketches the post in, then the colour arrives.",
        note: "The content is drawn, not dropped in.",
      },
      {
        id: "melt",
        demo: "skeleton-melt",
        title: "Melt",
        description: "A quiet grey that breathes, then melts away as the content appears.",
        note: "A placeholder at rest, rather than busy.",
      },
      {
        id: "morph",
        demo: "skeleton-morph",
        title: "Morph",
        description: "Each placeholder shape turns into the thing it stood for.",
        note: "One thing becoming another, not one leaving as another arrives.",
      },
      {
        id: "one-light",
        demo: "skeleton-one-light",
        title: "One light",
        description: "One light passing over the whole placeholder.",
        note: "The classic shimmer, as one sweep instead of many out of step.",
      },
      {
        id: "ink",
        demo: "skeleton-ink",
        title: "Ink",
        description: "The text is written in, line by line.",
        note: "The placeholder already has the shape of the words.",
      },
      {
        id: "blur-up",
        demo: "skeleton-blur-up",
        title: "Blur-up",
        description: "The text arrives with a blurred preview of the picture, which sharpens when it lands.",
        note: "Something to look at while the rest is on its way.",
      },
      {
        id: "out-of-order",
        demo: "skeleton-out-of-order",
        title: "Out of order",
        description: "Each part arrives on its own, without moving anything else.",
        note: "Real pages rarely load all at once.",
      },
      {
        id: "patience",
        demo: "skeleton-patience",
        title: "Patience",
        description: "For a long load, the placeholder says so, quietly.",
        note: "A shimmer promises a short wait; this one is honest when it isn't.",
      },
    ],
  },
];
