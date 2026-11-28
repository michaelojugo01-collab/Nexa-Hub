import type { FileRules, ProductTypeDef } from '@nexa/api-contract';

/**
 * The digital product types (Ways To Earn A1–A12 and I4). Data, not code: the app's create
 * flow, labels and upload rules all come from here (GET /v1/product-types).
 * Size limits are PROPOSED (docs/decisions.md, F4).
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

const PDF = { ext: ['pdf'], types: ['application/pdf'] };
const ZIP = { ext: ['zip'], types: ['application/zip', 'application/x-zip-compressed'] };
const PNG = { ext: ['png'], types: ['image/png'] };
const JPG = { ext: ['jpg', 'jpeg'], types: ['image/jpeg'] };
const SVG = { ext: ['svg'], types: ['image/svg+xml'] };
const MP4 = { ext: ['mp4'], types: ['video/mp4'] };
const MOV = { ext: ['mov'], types: ['video/quicktime'] };
const MP3 = { ext: ['mp3'], types: ['audio/mpeg'] };
const WAV = { ext: ['wav'], types: ['audio/wav', 'audio/x-wav', 'audio/wave'] };
const DOCX = {
  ext: ['docx'],
  types: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
const XLSX = {
  ext: ['xlsx'],
  types: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};
const PPTX = {
  ext: ['pptx'],
  types: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};
const CSV = { ext: ['csv'], types: ['text/csv'] };
const ODS = { ext: ['ods'], types: ['application/vnd.oasis.opendocument.spreadsheet'] };
const TXT = { ext: ['txt'], types: ['text/plain'] };
const JSONF = { ext: ['json'], types: ['application/json'] };
const XMP = { ext: ['xmp'], types: ['application/rdf+xml', 'application/octet-stream'] };
const CUBE = { ext: ['cube'], types: ['application/octet-stream', 'text/plain'] };
const FONT = {
  ext: ['ttf', 'otf'],
  types: ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/octet-stream'],
};

function files(kinds: { ext: string[]; types: string[] }[], maxBytes: number): FileRules {
  const extensions = kinds.flatMap((k) => k.ext);
  const label = `${[...new Set(kinds.map((k) => k.ext[0]!.toUpperCase()))].join(', ')}, up to ${
    maxBytes >= GB ? `${maxBytes / GB} GB` : `${maxBytes / MB} MB`
  }`;
  return {
    extensions,
    contentTypes: [...new Set(kinds.flatMap((k) => k.types))],
    maxBytes,
    label,
  };
}

export const productTypes: ProductTypeDef[] = [
  {
    code: 'A1',
    name: 'Ebooks and guides',
    description: 'A PDF guide or ebook. Buyers read it in the app.',
    group: 'Read and learn',
    defaultCategorySlug: 'books',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([PDF], 200 * MB),
    preview: 'pages',
  },
  {
    code: 'A10',
    name: 'Study guides and original notes',
    description: 'Your own summaries and revision notes. No leaked exams or past-paper answers.',
    group: 'Read and learn',
    defaultCategorySlug: 'education',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([PDF], 200 * MB),
    preview: 'pages',
  },
  {
    code: 'A11',
    name: 'Printables and worksheets',
    description: 'Planners, flashcards, lesson plans and worksheets to print.',
    group: 'Read and learn',
    defaultCategorySlug: 'books',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([PDF, PNG, ZIP], 200 * MB),
    preview: 'pages',
  },
  {
    code: 'A6',
    name: 'Video lessons and masterclasses',
    description: 'Recorded lessons buyers stream in the app. No downloads.',
    group: 'Video and audio',
    defaultCategorySlug: 'education',
    modes: ['STREAM_ONLY'],
    rightsRequired: true,
    files: files([MP4, MOV], 4 * GB),
    preview: 'video_clip',
  },
  {
    code: 'A4',
    name: 'Music and audio',
    description: 'Beats, samples, stems, sound effects and voiceover packs.',
    group: 'Video and audio',
    defaultCategorySlug: 'music',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: true,
    files: files([MP3, WAV, ZIP], GB),
    preview: 'audio_clip',
  },
  {
    code: 'A5',
    name: 'Stock media',
    description: 'Your original photos, video footage, illustrations and 3D assets.',
    group: 'Video and audio',
    defaultCategorySlug: 'photography',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: true,
    files: files([JPG, PNG, MP4, MOV, ZIP], 2 * GB),
    preview: 'none',
  },
  {
    code: 'A2',
    name: 'Templates',
    description: 'CV, Canva, Notion, Excel, pitch deck, business plan and invoice templates.',
    group: 'Templates and tools',
    defaultCategorySlug: 'business',
    modes: ['DOWNLOAD_LIMITED', 'LINK'],
    rightsRequired: false,
    files: files([PDF, DOCX, XLSX, PPTX, ZIP], 200 * MB),
    preview: 'pages',
  },
  {
    code: 'A7',
    name: 'Spreadsheets and trackers',
    description: 'Budget planners, business trackers, timetables and GPA planners.',
    group: 'Templates and tools',
    defaultCategorySlug: 'business',
    modes: ['DOWNLOAD_LIMITED', 'LINK'],
    rightsRequired: false,
    files: files([XLSX, CSV, ODS, PDF], 100 * MB),
    preview: 'none',
  },
  {
    code: 'I4',
    name: 'Notion, Airtable and Excel systems',
    description: 'Complete systems: a Notion or Airtable link, or an Excel file.',
    group: 'Templates and tools',
    defaultCategorySlug: 'business',
    modes: ['LINK', 'DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([XLSX, CSV], 100 * MB),
    preview: 'none',
  },
  {
    code: 'A3',
    name: 'Design assets',
    description: 'Lightroom presets, LUTs, fonts, icons, mockups, brushes and UI kits.',
    group: 'Design and code',
    defaultCategorySlug: 'design',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([ZIP, PNG, JPG, SVG, XMP, CUBE, FONT], GB),
    preview: 'none',
  },
  {
    code: 'A8',
    name: 'Code and developer assets',
    description: 'Scripts, website themes, UI components and bot templates.',
    group: 'Design and code',
    defaultCategorySlug: 'tech',
    modes: ['DOWNLOAD_LIMITED'],
    rightsRequired: false,
    files: files([ZIP], 500 * MB),
    preview: 'none',
  },
  {
    code: 'A9',
    name: 'Prompt packs and AI workflows',
    description: 'Tested prompt libraries and automation workflows.',
    group: 'Design and code',
    defaultCategorySlug: 'tech',
    modes: ['DOWNLOAD_LIMITED', 'LINK'],
    rightsRequired: false,
    files: files([PDF, TXT, JSONF, ZIP], 100 * MB),
    preview: 'pages',
  },
  {
    code: 'A12',
    name: 'Link-based products',
    description: 'A private doc, Notion page, Drive folder or video link, shown after payment.',
    group: 'Links',
    defaultCategorySlug: 'business',
    modes: ['LINK'],
    rightsRequired: false,
    files: null,
    preview: 'none',
  },
];

export function findProductType(code: string) {
  return productTypes.find((t) => t.code === code);
}

/** Categories nobody can sell in (Ways To Earn Part 4). Never listed; refused if sent. */
export const prohibitedCategories = [
  { id: 'cat_betting', slug: 'betting-tips', name: 'Betting tips' },
];

export const tagFixtures = [
  'ankara',
  'adire',
  'aso-ebi',
  'fashion',
  'jamb',
  'waec',
  'neco',
  'post-utme',
  'study-guide',
  'canva',
  'notion',
  'excel',
  'small-business',
  'branding',
  'logo',
  'afrobeats',
  'amapiano',
  'beats',
  'samples',
  'cooking',
  'jollof',
  'skincare',
  'lightroom',
  'presets',
  'photography',
  'chatgpt',
  'ai',
  'react',
  'website',
  'printable',
  'planner',
  'budget',
  'fitness',
].map((slug) => ({ slug, name: slug.replace(/-/g, ' ') }));
