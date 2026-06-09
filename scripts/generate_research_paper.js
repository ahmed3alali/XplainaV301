const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition, TableOfContents
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─────────────────────── Helpers ───────────────────────
const border = { style: BorderStyle.SINGLE, size: 4, color: "2C5F8A" };
const lightBorder = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const borders = { top: border, bottom: border, left: border, right: border };
const lightBorders = { top: lightBorder, bottom: lightBorder, left: lightBorder, right: lightBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const CONTENT_WIDTH = 9360; // US Letter, 1" margins

function h(text, level, opts = {}) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    ...opts,
    children: [new TextRun({ text, bold: true })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 160 },
    ...opts,
    children: typeof text === 'string'
      ? [new TextRun({ text, font: "Times New Roman", size: 24 })]
      : text
  });
}

function runs(...parts) {
  // parts = [[text, bold?, italic?], ...]
  return parts.map(([t, bold, italic]) =>
    new TextRun({ text: t, bold: !!bold, italics: !!italic, font: "Times New Roman", size: 24 })
  );
}

function italic(text) {
  return new TextRun({ text, italics: true, font: "Times New Roman", size: 24 });
}

function bold(text) {
  return new TextRun({ text, bold: true, font: "Times New Roman", size: 24 });
}

function normal(text) {
  return new TextRun({ text, font: "Times New Roman", size: 24 });
}

function pRuns(runArr, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 160 },
    ...opts,
    children: runArr
  });
}

function blankLine() {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: 0, after: 0 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function headerCell(text, width, shade = "2C5F8A") {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Times New Roman", size: 20 })]
    })]
  });
}

function dataCell(text, width, shade = "FFFFFF", center = false) {
  return new TableCell({
    borders: lightBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, font: "Times New Roman", size: 20 })]
    })]
  });
}

function dataCellBold(text, width, shade = "FFFFFF") {
  return new TableCell({
    borders: lightBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 20 })]
    })]
  });
}

function tableNote(text) {
  return new Paragraph({
    spacing: { before: 60, after: 160 },
    children: [new TextRun({ text, italics: true, font: "Times New Roman", size: 20 })]
  });
}

function figCaption(num, desc) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200 },
    children: [
      new TextRun({ text: `Figure ${num}. `, bold: true, font: "Times New Roman", size: 22 }),
      new TextRun({ text: desc, italics: true, font: "Times New Roman", size: 22 }),
    ]
  });
}

function tableCaption(num, desc) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({ text: `Table ${num}. `, bold: true, font: "Times New Roman", size: 22 }),
      new TextRun({ text: desc, font: "Times New Roman", size: 22 }),
    ]
  });
}

function li(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text, font: "Times New Roman", size: 24 })]
  });
}

function liRuns(runArr, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 80 },
    children: runArr
  });
}

// ─────────────────────── Tables ───────────────────────

// Table 1: Dataset statistics
function datasetStatsTable() {
  const rows = [
    ["Total rating interactions", "233,306"],
    ["Unique users", "33,901"],
    ["Unique courses in catalogue", "307"],
    ["Courses with ≥1 real rating", "126"],
    ["Courses with zero ratings (cold-start)", "181 (~59%)"],
    ["User-item matrix sparsity", "97.76%"],
    ["Average genres per course", "1.54"],
    ["Missing values", "0"],
  ];
  const colW = [5200, 4160];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [headerCell("Statistic", colW[0]), headerCell("Value", colW[1])] }),
      ...rows.map((r, i) => new TableRow({
        children: [dataCell(r[0], colW[0], i % 2 === 0 ? "F0F5FA" : "FFFFFF"), dataCell(r[1], colW[1], i % 2 === 0 ? "F0F5FA" : "FFFFFF", true)]
      }))
    ]
  });
}

// Table 2: Regression model CV results
function regressionTable() {
  const rows = [
    ["Gradient Boosting", "0.1797", "0.3133", "✓"],
    ["Random Forest", "0.1846", "0.3021", ""],
    ["Ridge Regression", "0.2311", "0.3115", ""],
    ["Linear Regression", "0.3244", "0.4239", ""],
  ];
  const colW = [3200, 1900, 1900, 2360];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [headerCell("Model", colW[0]), headerCell("CV MAE", colW[1]), headerCell("CV RMSE", colW[2]), headerCell("Selected", colW[3])] }),
      ...rows.map((r, i) => new TableRow({
        children: [
          dataCell(r[0], colW[0], i % 2 === 0 ? "F0F5FA" : "FFFFFF"),
          dataCell(r[1], colW[1], i % 2 === 0 ? "F0F5FA" : "FFFFFF", true),
          dataCell(r[2], colW[2], i % 2 === 0 ? "F0F5FA" : "FFFFFF", true),
          dataCell(r[3], colW[3], i % 2 === 0 ? "F0F5FA" : "FFFFFF", true),
        ]
      }))
    ]
  });
}

// Table 3: Content-based results (before/after)
function contentBasedTable() {
  const rows = [
    ["TF-IDF", "Before", "0.0196", "0.001", "0.5033", "0.0580", "0.2958", "0.1980", "0.4104"],
    ["TF-IDF", "After",  "0.0547", "0.0052","0.4700","0.0557", "0.2923", "0.1817", "1.0000"],
    ["BoW",    "Before", "0.0199", "0.001", "0.4500", "0.0510", "0.2632", "0.1851", "0.4104"],
    ["BoW",    "After",  "0.0590", "0.0059","0.3967","0.0490", "0.2623", "0.1691", "1.0000"],
  ];
  const colW = [1200, 1000, 1000, 900, 1100, 1100, 1000, 1000, 1060];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [
        headerCell("Model", colW[0]), headerCell("Phase", colW[1]),
        headerCell("RMSE", colW[2]), headerCell("MAE", colW[3]),
        headerCell("HR@10", colW[4]), headerCell("P@10", colW[5]),
        headerCell("R@10", colW[6]), headerCell("NDCG@10", colW[7]), headerCell("Cov.", colW[8])
      ]}),
      ...rows.map((r, i) => new TableRow({
        children: r.map((v, j) => dataCell(v, colW[j], i % 2 === 0 ? "F0F5FA" : "FFFFFF", j > 1))
      }))
    ]
  });
}

// Table 4: CF results (before/after)
function cfTable() {
  const rows = [
    ["User-KNN","Before","0.0693","0.0213","0.6081","0.0831","0.4855","0.2871","0.7698"],
    ["User-KNN","After", "0.0296","0.0144","0.7059","0.0876","0.5740","0.3267","0.3420"],
    ["Item-KNN","Before","0.0624","0.0039","0.3311","0.0372","0.2213","0.1189","0.9048"],
    ["Item-KNN","After", "0.0161","0.0014","0.3595","0.0405","0.2461","0.1487","0.3779"],
  ];
  const colW = [1200, 1000, 1000, 900, 1100, 1100, 1000, 1000, 1060];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [
        headerCell("Model", colW[0]), headerCell("Phase", colW[1]),
        headerCell("RMSE", colW[2]), headerCell("MAE", colW[3]),
        headerCell("HR@10", colW[4]), headerCell("P@10", colW[5]),
        headerCell("R@10", colW[6]), headerCell("NDCG@10", colW[7]), headerCell("Cov.", colW[8])
      ]}),
      ...rows.map((r, i) => new TableRow({
        children: r.map((v, j) => dataCell(v, colW[j], i % 2 === 0 ? "F0F5FA" : "FFFFFF", j > 1))
      }))
    ]
  });
}

// Table 5: Hybrid comparison
function hybridComparisonTable() {
  const rows = [
    ["Content-TF-IDF","0.0173","0.0012","0.4650","0.0510","0.2822","0.1761","1.0000"],
    ["Content-BoW",   "0.0173","0.0012","0.4600","0.0515","0.2764","0.1713","1.0000"],
    ["CF-User-KNN",   "0.0296","0.0144","0.7059","0.0876","0.5740","0.3267","0.3420"],
    ["CF-Item-KNN",   "0.0161","0.0014","0.3595","0.0405","0.2461","0.1487","0.3779"],
    ["Hybrid (α=0.5)","1.7539","1.3893","0.7700","0.1080","0.6442","0.4475","0.3876"],
  ];
  const colW = [1700, 1000, 900, 1000, 1000, 1000, 1000, 760];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [
        headerCell("Model", colW[0]), headerCell("RMSE", colW[1]), headerCell("MAE", colW[2]),
        headerCell("HR@10", colW[3]), headerCell("P@10", colW[4]),
        headerCell("R@10", colW[5]), headerCell("NDCG@10", colW[6]), headerCell("Cov.", colW[7])
      ]}),
      ...rows.map((r, i) => new TableRow({
        children: r.map((v, j) => {
          const shade = i === 4 ? "E8F4E8" : (i % 2 === 0 ? "F0F5FA" : "FFFFFF");
          return i === 4
            ? dataCellBold(v, colW[j], "E8F4E8")
            : dataCell(v, colW[j], shade, j > 0);
        })
      }))
    ]
  });
}

// Table 6: Alpha sweep
function alphaSweepTable() {
  const rows = [
    ["0.0 (content only)","0.385","0.0435","0.280","0.173","0.404"],
    ["0.3",               "0.670","0.0885","0.529","0.380","0.410"],
    ["0.5 (optimal)",     "0.770","0.1080","0.644","0.448","0.388"],
    ["0.6",               "0.770","0.1075","0.643","0.447","0.391"],
    ["0.8",               "0.770","0.1075","0.643","0.447","0.391"],
    ["1.0 (CF only)",     "0.685","0.0900","0.548","0.307","0.381"],
  ];
  const colW = [2000, 1400, 1400, 1300, 1300, 1960];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [
        headerCell("α Value", colW[0]), headerCell("HR@10", colW[1]), headerCell("P@10", colW[2]),
        headerCell("R@10", colW[3]), headerCell("NDCG@10", colW[4]), headerCell("Coverage", colW[5])
      ]}),
      ...rows.map((r, i) => new TableRow({
        children: r.map((v, j) => {
          const shade = i === 2 ? "E8F4E8" : (i % 2 === 0 ? "F0F5FA" : "FFFFFF");
          return i === 2
            ? dataCellBold(v, colW[j], "E8F4E8")
            : dataCell(v, colW[j], shade, j > 0);
        })
      }))
    ]
  });
}

// Table 7: API endpoints
function apiEndpointsTable() {
  const rows = [
    ["POST /auth/signup", "Register a new real user"],
    ["POST /auth/login", "Authenticate and issue JWT token"],
    ["GET /users/me", "Return authenticated user profile"],
    ["GET /courses", "List paginated course catalogue"],
    ["GET /courses/all", "Return full course catalogue"],
    ["GET /courses/my-courses", "Return courses enrolled by current user"],
    ["GET /recommend/{user_id}", "Hybrid recommendations for dataset user"],
    ["POST /recommend/dynamic", "Hybrid recommendations for real (new) user"],
    ["GET /explain/{user_id}/{course_id}", "SHAP/LIME explanations for dataset user"],
    ["POST /explain/dynamic", "Explanations for new user course"],
    ["POST /llm-explain", "LLM narrative explanation for dataset user"],
    ["POST /llm-explain/dynamic", "LLM narrative for new user course"],
    ["POST /profile/skills-to-courses", "Map skill tags to recommended courses"],
    ["POST /profile/save-profile", "Persist user skill profile"],
    ["POST /mentor/chat", "Conversational mentor (persona: Ahmed)"],
    ["GET /admin/users", "Admin: list all users with activity"],
    ["POST /admin/invite", "Admin: generate registration invite code"],
    ["GET /admin/stats", "Admin: platform usage statistics"],
    ["GET /admin/audit-log", "Admin: system activity log"],
    ["GET /admin/export-csv", "Admin: export user data as CSV"],
  ];
  const colW = [3800, 5560];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [headerCell("Endpoint", colW[0]), headerCell("Description", colW[1])] }),
      ...rows.map((r, i) => new TableRow({
        children: [
          dataCell(r[0], colW[0], i % 2 === 0 ? "F0F5FA" : "FFFFFF"),
          dataCell(r[1], colW[1], i % 2 === 0 ? "F0F5FA" : "FFFFFF"),
        ]
      }))
    ]
  });
}

// Table 8: Hyperparameter summary
function hyperparamTable() {
  const rows = [
    ["User-KNN neighbours (k)", "20", "Phase 2 & 6 CF training"],
    ["Item-KNN neighbours (k)", "20", "Phase 2 & 6 CF training"],
    ["Regression CV folds", "5", "Phase 3 model selection"],
    ["Hybrid weight (α)", "0.5", "Empirically tuned (Section 5.7)"],
    ["Dynamic CF Jaccard neighbours", "15", "Cold-start new users"],
    ["RF Surrogate estimators", "100", "XAI surrogate model"],
    ["RF Surrogate max depth", "5", "XAI surrogate model"],
    ["RF Surrogate random state", "42", "Reproducibility"],
    ["Rating clip range", "[1, 3]", "IBM-style scale enforcement"],
    ["Top-N recommendations", "10", "Default output list size"],
    ["JWT expiry", "7 days", "Authentication layer"],
    ["TF-IDF stop words", "English", "Content vectorization"],
    ["LLM model (OpenAI path)", "gpt-3.5-turbo", "Optional LLM layer"],
    ["LLM model (Anthropic path)", "claude-3-haiku-20240307", "Optional LLM layer"],
  ];
  const colW = [3200, 1600, 4560];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({ children: [headerCell("Parameter", colW[0]), headerCell("Value", colW[1]), headerCell("Scope", colW[2])] }),
      ...rows.map((r, i) => new TableRow({
        children: [
          dataCell(r[0], colW[0], i % 2 === 0 ? "F0F5FA" : "FFFFFF"),
          dataCell(r[1], colW[1], i % 2 === 0 ? "F0F5FA" : "FFFFFF", true),
          dataCell(r[2], colW[2], i % 2 === 0 ? "F0F5FA" : "FFFFFF"),
        ]
      }))
    ]
  });
}

// ─────────────────────── Document ───────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      },
    ]
  },
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Times New Roman", color: "1A3A5C" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Times New Roman", color: "2C5F8A" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, italics: true, font: "Times New Roman", color: "000000" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2C5F8A", space: 1 } },
          children: [
            new TextRun({ text: "Claripath: Explainable Hybrid Course Recommendation Engine", font: "Times New Roman", size: 20, color: "555555" }),
            new TextRun({ text: "\t", font: "Times New Roman", size: 20 }),
            new TextRun({ text: "[University Name] | Software Engineering", font: "Times New Roman", size: 20, color: "555555" }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "2C5F8A", space: 1 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Times New Roman", size: 20, color: "555555" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 20, color: "555555" }),
            new TextRun({ text: " of ", font: "Times New Roman", size: 20, color: "555555" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Times New Roman", size: 20, color: "555555" }),
          ]
        })]
      })
    },
    children: [

      // ── TITLE PAGE ──
      blankLine(), blankLine(), blankLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "CLARIPATH: AN EXPLAINABLE HYBRID COURSE RECOMMENDATION", bold: true, font: "Times New Roman", size: 32, color: "1A3A5C" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "ENGINE FOR MOOC AND IBM-STYLE LEARNING PLATFORMS", bold: true, font: "Times New Roman", size: 32, color: "1A3A5C" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: "Alternative Titles:", italics: true, font: "Times New Roman", size: 24, color: "555555" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "(1) XplainaV301: Combining Hybrid Filtering and Explainable AI for Personalized Online Course Recommendation", italics: true, font: "Times New Roman", size: 22, color: "555555" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        children: [new TextRun({ text: "(2) Transparent Personalization: A Hybrid Recommender System with SHAP and LIME Explanations for Educational Platforms", italics: true, font: "Times New Roman", size: 22, color: "555555" })]
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: "[Student Name(s)]", bold: true, font: "Times New Roman", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Department of Software Engineering", font: "Times New Roman", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "[University Name]", font: "Times New Roman", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Course: [Course Code] | Term 2, 4th Year", font: "Times New Roman", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Supervisor: [Course Supervisor Name]", font: "Times New Roman", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Submission Date: [Date]", font: "Times New Roman", size: 24 })]
      }),

      pageBreak(),

      // ── ABSTRACT ──
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "Abstract", bold: true, font: "Times New Roman", size: 28, color: "1A3A5C" })]
      }),
      p("Online learning platforms (MOOCs and IBM-style course catalogues) now list hundreds of courses. Learners struggle to find the right ones. Standard recommender systems can suggest courses, but they rarely explain why. This paper describes Claripath, a course recommendation system built as a fourth-year Software Engineering capstone project. The system combines TF-IDF content filtering, User-KNN collaborative filtering, and regression to fill in ratings for 181 courses that had no ratings before. These parts are merged in a hybrid model with weight alpha = 0.5. We tested the system on an IBM-style dataset with 233,306 ratings from 33,901 users across 307 courses. The hybrid model beat each part alone on the main ranking metrics: Hit Rate@10 = 0.77, Precision@10 = 0.108, Recall@10 = 0.644, and NDCG@10 = 0.448. To make recommendations understandable, we use SHAP and LIME explanations on a small Random Forest model built for each request. New users without history get recommendations through Jaccard-weighted blending with similar users. The deployed system uses a FastAPI backend, a Next.js frontend with explanation charts, Supabase PostgreSQL for accounts, and an optional LLM layer for plain-language summaries. Combining content and collaborative filtering with explanations gives accurate and understandable course suggestions."),
      blankLine(),
      pRuns([bold("Keywords: "), normal("recommender systems; explainable AI; SHAP; LIME; hybrid filtering; collaborative filtering; MOOC; cold-start")]),

      pageBreak(),

      // ── TABLE OF CONTENTS ──
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),

      pageBreak(),

      // ── 1. INTRODUCTION ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. Introduction", bold: true })] }),

      p("Online education has grown fast. Platforms like MOOCs and IBM SkillsBuild offer hundreds of courses in areas such as machine learning, cloud computing, and data science. More choice is good, but learners must search large catalogues on their own to find courses that fit their goals and background (Uddin et al., 2021; Najmani et al., 2022)."),

      p("Recommender systems help reduce this overload (Lu et al., 2012). Content-based filtering (CBF) uses course titles and genres to suggest similar courses. Collaborative filtering (CF) uses what similar users rated to suggest courses (Sarwar et al., 2001; Herlocker et al., 2004). Combining both in a hybrid system usually works better than either alone (Burke, 2002). However, most systems still do not explain their suggestions. Students cannot see why a course was picked; advisors cannot check the logic; and administrators cannot verify that recommendations match learning goals (Tintarev & Masthoff, 2012; Ghazimatin et al., 2021)."),

      p("This matters in education because course choices affect degrees, certificates, and careers. A list of recommendations without reasons may be ignored or misused. Explainable AI (XAI) methods such as SHAP (Lundberg & Lee, 2017) and LIME (Ribeiro et al., 2016) can show which features (for example, genres) pushed a score up or down."),

      p("Another problem is cold start: new users with no ratings, and courses that nobody has rated yet. Collaborative filtering alone cannot handle these cases well. In our dataset, about 59% of courses (181 out of 307) have zero real ratings, so standard CF never recommends them."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1.1 Contributions", bold: true })] }),

      p("This paper presents Claripath (project name XplainaV301 in the code repository), an explainable hybrid course recommender built as a final-year Software Engineering capstone. Our main contributions are:"),
      liRuns([normal("A full pipeline from raw IBM-style ratings and genre data to a working web app, in twelve Jupyter notebooks.")]),
      liRuns([normal("Gradient Boosting regression to predict ratings for 181 unrated courses, so collaborative filtering can use the full catalogue.")]),
      liRuns([normal("A hybrid model with "), italic("α"), normal(" = 0.5 that mixes User-KNN and TF-IDF scores, reaching Hit Rate@10 = 0.77 and NDCG@10 = 0.448 on test data.")]),
      liRuns([normal("SHAP and LIME explanations on a small Random Forest built per request, showing which genres matter for each recommendation.")]),
      liRuns([normal("Jaccard-based blending for new users who sign up and pick courses, without retraining the model.")]),
      liRuns([normal("A deployed stack: FastAPI API, Next.js UI with SHAP/LIME charts, Supabase database, JWT login, and optional LLM text explanations.")]),
      blankLine(),

      p("Section 2 reviews related work. Section 3 describes the data. Section 4 explains the methods. Section 5 covers experiments. Section 6 gives results. Section 7 describes the system. Section 8 discusses findings and limits. Section 9 concludes."),

      pageBreak(),

      // ── 2. RELATED WORK ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "2. Related Work", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.1 Recommender Systems in Educational Contexts", bold: true })] }),

      p("Many studies apply recommenders to education: MOOCs, tutoring systems, and course planning (Lu et al., 2012). Lu et al. (2012) surveyed collaborative, content-based, and hybrid methods. For MOOCs, Uddin et al. (2021) found that CF and CBF are most common, but cold start and scale remain hard. Najmani et al. (2022) also reviewed MOOC recommenders and noted growing need for transparency as catalogues grow."),

      p("Assami et al. (2020) used semantic features for MOOC recommendations. Praseptiawan et al. (2024a; 2024b) combined content filtering, collaborative filtering, and explainable AI on MOOCs; they report that explanations can increase trust without hurting ranking much. That supports our use of both SHAP and LIME. Maiti and Priyaadharshini (2022) looked at recommenders for lower-achieving students, which shows why fair personalization matters."),

      p("In higher education, Cui et al. (2019) showed that interpretable predictive models help student success, and Gasevic et al. (2019) described how schools adopt learning analytics. Explainability matters for advisors and institutions, not only students. Deepak and Trivedi (2023) used deep learning for course recommendation with strong results but weak interpretability. We chose simpler models plus SHAP/LIME instead of a black-box neural network."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.2 Content-Based Filtering with TF-IDF", bold: true })] }),

      p("Content-based filtering turns each course into a feature vector and recommends courses similar to what the user already took. TF-IDF (Salton & Buckley, 1988) is a common way to weight words in titles and tags: rare terms count more than common ones. Cosine similarity then measures how alike two courses are. Bag-of-Words (BoW) is a simpler baseline without that weighting. Sapre et al. (2024) used TF-IDF for course recommendation; Suneetha et al. found it works well on medium-sized catalogues. Our system builds TF-IDF from course titles plus genre names, giving about 100 features for 307 courses."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.3 Collaborative Filtering", bold: true })] }),

      p("Collaborative filtering (CF) uses patterns in user ratings. User-KNN (Herlocker et al., 2004) finds similar users and predicts from their ratings. Item-KNN (Sarwar et al., 2001) finds similar courses instead. Both struggle when the rating matrix is very sparse: few shared ratings mean poor neighbours and many zero predictions (Schein et al., 2002). Our matrix is 97.76% empty, so this is a major issue. Nikolakopoulos et al. (2018) used matrix factorization (EigenRec) with good results; we note that as future work."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.4 Hybrid Recommender Systems", bold: true })] }),

      p("Burke (2002) described several ways to combine recommenders, including weighted hybrids that mix scores with a parameter α. That approach is simple and easy to explain. Jia (2023) and Sun (2023) proposed other hybrid and deep learning designs. We use a weighted mix of normalized CF and content scores and test α from 0.0 to 1.0 to pick the best value. Injadat et al. (2021) surveyed machine learning in intelligent systems, which helps place hybrid recommenders in context."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.5 Explainable AI for Recommender Systems", bold: true })] }),

      p("Users and regulators increasingly want to know why a system made a suggestion (Tintarev & Masthoff, 2012). We use two explanation methods. SHAP (Lundberg & Lee, 2017) assigns each feature a fair share of the prediction. LIME (Ribeiro et al., 2016) fits a simple local model around one prediction to show which features mattered. Both work with tree models (Breiman, 2001). Ghazimatin et al. (2021) showed that user feedback on explanations can improve recommenders; we leave that for future work. Yang et al. (2020) and Lin et al. (2019) studied learning analytics dashboards, which informed our UI design."),

      p("Our hybrid score is just a weighted sum, not a single neural network we can differentiate. So for each request we train a small Random Forest (Breiman, 2001) on genre features to approximate hybrid scores for all 307 courses for that user. We run SHAP and LIME on that surrogate and show genre bars in the frontend. This is a standard way to explain models that are hard to interpret directly."),

      pageBreak(),

      // ── 3. DATASET & PROBLEM FORMULATION ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. Dataset and Problem Formulation", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "3.1 Data Sources", bold: true })] }),

      p("We use two data files from an IBM-style learning platform. The ratings file has 233,306 rows: user ID, course ID, and rating on a 3-point scale (1, 2, or 3; most ratings are 2 or 3). The course file lists 307 courses with title and 14 genre flags (0 or 1): Database, Python, CloudComputing, DataAnalysis, Containers, MachineLearning, ComputerVision, DataScience, BigData, Chatbot, R, BackendDev, FrontendDev, and Blockchain. Neither file had missing values after loading."),

      p("Table 1 summarizes the dataset. Figure 1 shows rating and per-user activity distributions. Figure 2 shows how often each genre appears and how many genres each course has."),
      blankLine(),

      tableCaption(1, "Dataset Summary Statistics"),
      datasetStatsTable(),
      tableNote("Note. HR@10 = Hit Rate at 10; P@10 = Precision at 10; R@10 = Recall at 10; Cov. = Catalogue Coverage."),
      blankLine(),

      p("Importantly, 181 courses (about 59%) have no real ratings at all, so standard CF cannot recommend them without extra steps. The user–course matrix is 97.76% empty, which is typical of very sparse data where KNN methods often fail (Schein et al., 2002)."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "3.2 Problem Formulation", bold: true })] }),

      p("We define the task as follows. There are 33,901 users and 307 courses. Each rating is 1, 2, or 3 if present, or missing otherwise. For each user, we want a ranked list of up to N = 10 courses they have not taken yet, scored so that good courses rank high. We measure success with the metrics in Section 5."),

      p("The hybrid prediction function takes the form:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "hybrid(u, i) = α · CF_norm(u, i) + (1 − α) · Content_norm(u, i)", font: "Courier New", size: 24, bold: true })]
      }),
      p("CF_norm and Content_norm are collaborative and content scores scaled to 0–1 separately. α is the blend weight (0 = only content, 1 = only CF). We also aim to explain each recommendation using SHAP and LIME values for the 14 genre features."),

      pageBreak(),

      // ── 4. METHODOLOGY ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. Methodology", bold: true })] }),

      p("Claripath runs in nine main phases across twelve Jupyter notebooks. Figure 3 shows the overall flow. Each phase is described below."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.1 Phase 0: Exploratory Data Analysis and Cleaning", bold: true })] }),
      p("In notebook 01_EDA_Clean.ipynb we loaded ratings and genres, removed duplicates, and checked for nulls. Ratings 2 and 3 are most common; rating 1 is rare. Most users rated between 2 and 10 courses; a few rated many more. Of 307 courses, 126 (41%) have at least one rating and 181 (59%) have none. Python and DataScience are common genres; Blockchain and Chatbot are rare. Courses have about 1.54 genres on average. Outputs: cleaned_courses.csv and unrated_courses_from_eda.csv."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.2 Phase 1: Content-Based Filtering", bold: true })] }),
      p("Notebooks 02 and 05 build a text string for each course: lowercase title plus active genre names. We vectorize with TF-IDF (English stop words removed) and Bag-of-Words. TF-IDF uses about 100 features for 307 courses."),
      p("We compute cosine similarity between every pair of courses (307 × 307 matrix). For user u and candidate course i, the content score is a similarity-weighted average of the user's training ratings:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "content_score(u, i) = Σ_{j ∈ R_u} sim(i, j) · r_{u,j} / Σ_{j ∈ R_u} sim(i, j)", font: "Courier New", size: 22 })]
      }),
      p("R_u is the courses user u rated in training; sim(i, j) is cosine similarity between courses i and j. Cosine similarity fits well here because which genres are on matters more than how many words are in the title. Figure 5 and Figure 12 show sample similarity heatmaps."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.3 Phase 2: Collaborative Filtering", bold: true })] }),
      p("Notebooks 03 and 06 test User-KNN and Item-KNN with k = 20 neighbours. Missing ratings are treated as 0 for similarity. Cosine similarity finds neighbours. User-KNN predicts:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "CF_user(u, i) = Σ_{v ∈ N_u(i)} sim(u, v) · r_{v,i} / Σ_{v ∈ N_u(i)} |sim(u, v)|", font: "Courier New", size: 22 })]
      }),
      p("N_u(i) are the k nearest users to u who rated course i. Before augmentation, most predictions were 0 because neighbours had not rated that course—due to 97.76% sparsity and 181 unrated courses. That is why we added the regression step next."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.4 Phase 3: Regression Augmentation for Unrated Courses", bold: true })] }),
      p("Notebook 04 fills ratings for unrated courses. For the 126 rated courses we computed average rating. We trained four models on title TF-IDF, 14 genres, and genre count: Linear Regression, Ridge, Random Forest, and Gradient Boosting. Five-fold cross-validation picked the best by mean absolute error. Table 2 shows the results."),
      blankLine(),

      tableCaption(2, "Regression Model Selection via 5-Fold Cross-Validation"),
      regressionTable(),
      tableNote("Note. CV MAE = Cross-Validation Mean Absolute Error; CV RMSE = Cross-Validation Root Mean Squared Error. Bold row indicates selected model."),
      blankLine(),

      p("Gradient Boosting had the lowest CV MAE (0.1797) and was used to predict ratings for 181 unrated courses. Predictions were clipped to [1, 3] and added as synthetic rows with negative user IDs. The full dataset then has 233,487 rows and 34,082 users (33,901 real plus 181 synthetic). Figure 13 shows the distribution of predicted ratings."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.5 Phase 4: Re-evaluation After Augmentation", bold: true })] }),
      p("After augmentation we retrained CF on the larger matrix. Content similarity did not change because it uses titles and genres only. User-KNN predictions were saved to 06_pred_user_knn.pkl (34,082 users × 307 courses). Notebook 07 compared before/after metrics and saved charts to figures/ (Figures 5, 6, 8, 14, 15)."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.6 Phase 6: Hybrid Recommender", bold: true })] }),
      p("The hybrid model (H1_Hybrid_Recommender.ipynb, utils_hybrid.py) blends CF and content scores as in Section 3.2. Each score is scaled to 0–1 before mixing. We fixed a CF scaling bug: raw KNN scores were often 0 or between 2–3, so global scaling made everything look like 0% or 100%. We now scale only non-zero CF values, which gives sensible percentages in the UI (Figure 17). We skip courses the user already took and return the top 10. We set α = 0.5 from the sweep in Section 5.3."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.7 Cold-Start for New Real Users", bold: true })] }),
      p("Users from the original dataset log in with a numeric ID and get precomputed KNN scores from a pickle file at startup. New users who register in Supabase and pick courses use dynamic CF (build_dynamic_cf_series). We measure overlap between the new user's courses S_new and each existing user's courses S_v with Jaccard similarity:"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "J(S_new, S_v) = |S_new ∩ S_v| / |S_new ∪ S_v|", font: "Courier New", size: 22 })]
      }),
      p("We take the top 15 similar users (J > 0) and blend their KNN predictions by Jaccard weight. That gives a CF score for the new user, then the normal hybrid step runs. No retraining is needed (Figure 20)."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.8 Phase 7: Dual Explainability via SHAP and LIME", bold: true })] }),
      p("The hybrid formula is a simple weighted sum, so we cannot get feature importance from it directly. For each request we train a Random Forest (100 trees, max depth 5) on 14 genre features and hybrid scores for all 307 courses for that user. The forest is thrown away after the request."),
      p("SHAP (Lundberg & Lee, 2017) shows how much each genre raised or lowered the score. LIME (Ribeiro et al., 2016) fits a local linear model for the same course. We also return up to three past courses from the user that are most similar to the recommendation."),
      p("Note: SHAP and LIME explain the Random Forest stand-in, not the hybrid formula line by line. With 307 courses and 14 features the stand-in is close enough to be useful. Figure 10 shows an example."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.9 Phase 8: Optional LLM Narrative Layer", bold: true })] }),
      p("Optionally (H3_LLM_Explanations.ipynb, utils_llm.py), an LLM turns SHAP, LIME, genres, and similar courses into a short plain-language paragraph. We support OpenAI (gpt-3.5-turbo) and Anthropic (claude-3-haiku-20240307). The user supplies the API key per request; we do not store keys. A fixed prompt template keeps outputs consistent."),

      pageBreak(),

      // ── 5. EXPERIMENTAL SETUP ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. Experimental Setup", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "5.1 Train/Test Split Protocol", bold: true })] }),
      p("To avoid leakage we split each user's ratings 80% train / 20% test (by row order), not random rows globally. Users with fewer than 5 ratings stayed fully in training so KNN still works. That gave 189,876 training rows and 43,611 test rows."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "5.2 Evaluation Metrics", bold: true })] }),
      p("We evaluate ranking at top 10 (N = 10). A test rating counts as relevant if it is 2 or 3 on the 3-point scale."),
      liRuns([bold("Hit Rate@10 (HR@10): "), normal("Share of users who get at least one relevant course in their top 10.")]),
      liRuns([bold("Precision@10 (P@10): "), normal("How many of the 10 recommended courses are relevant, on average.")]),
      liRuns([bold("Recall@10 (R@10): "), normal("How many of the user's relevant test courses appear in the top 10.")]),
      liRuns([bold("NDCG@10: "), normal("Ranking quality score that rewards putting good courses higher (Järvelin & Kekäläinen, 2002).")]),
      liRuns([bold("Catalogue Coverage: "), normal("What fraction of all 307 courses appear in someone's top 10.")]),
      liRuns([bold("RMSE and MAE: "), normal("Error on predicted scores. Hybrid RMSE/MAE are on a 0–1 blend scale, not the original 1–3 ratings, so compare them carefully.")]),
      blankLine(),
      p("We do not use classification metrics (accuracy, F1, confusion matrix) because this is a ranking task, not classification."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "5.3 Alpha Sweep for Hybrid Tuning", bold: true })] }),
      p("We tested α from 0.0 to 1.0 in steps of 0.1 on the test set and recorded all metrics. We chose the α with the best Hit Rate@10 and NDCG@10. Figure 16 plots HR@10 and NDCG@10 versus α."),

      pageBreak(),

      // ── 6. RESULTS ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "6. Results", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.1 Content-Based Filtering: Before and After Augmentation", bold: true })] }),
      p("Table 3 shows content-based results for TF-IDF and BoW before and after augmentation. Figure 5 plots the same metrics."),
      blankLine(),
      tableCaption(3, "Content-Based Filtering Results Before and After Augmentation"),
      contentBasedTable(),
      tableNote("Note. HR@10 = Hit Rate@10; P@10 = Precision@10; R@10 = Recall@10; Cov. = Catalogue Coverage."),
      blankLine(),

      p("After augmentation, content-based coverage rises from 41.04% to 100%, so all 307 courses can be reached. Hit Rate@10 and NDCG@10 drop slightly for both TF-IDF and BoW, likely because synthetic ratings add some noise. TF-IDF beats BoW on every metric, as expected when rare terms matter."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.2 Collaborative Filtering: Before and After Augmentation", bold: true })] }),
      p("Table 4 shows collaborative filtering results. Figure 6 compares them in a bar chart."),
      blankLine(),
      tableCaption(4, "Collaborative Filtering Results Before and After Augmentation"),
      cfTable(),
      tableNote("Note. HR@10 = Hit Rate@10; P@10 = Precision@10; R@10 = Recall@10; Cov. = Catalogue Coverage."),
      blankLine(),

      p("User-KNN beats Item-KNN on all ranking metrics. After augmentation, User-KNN reaches HR@10 = 0.7059 and NDCG@10 = 0.3267. Similar users often rate similar course types (for example data science), while similar courses overlap in genres and are harder to separate. Augmentation raises User-KNN HR@10 from 0.6081 to 0.7059 and Recall@10 from 0.4855 to 0.5740. Coverage drops for User-KNN (76.98% to 34.20%) because synthetic users use negative IDs and are excluded from evaluation, so recommendations focus on courses common in real user histories."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.3 Hybrid Model Performance", bold: true })] }),
      p("Table 5 compares all models, including the hybrid (α = 0.5). Figure 17 shows a grouped bar chart."),
      blankLine(),
      tableCaption(5, "Hybrid Model Comparison Against Component Baselines"),
      hybridComparisonTable(),
      tableNote("Note. Highlighted row (green) indicates the proposed hybrid model. RMSE/MAE for the hybrid model are inflated relative to component models because blended normalized scores are not on the original 1–3 rating scale; see Section 8 for discussion."),
      blankLine(),

      p("The hybrid model (α = 0.5) wins on all main ranking metrics: HR@10 = 0.77, Precision@10 = 0.108, Recall@10 = 0.644, NDCG@10 = 0.448. Compared to CF-User-KNN alone, the hybrid improves HR@10 by 8.4%, Precision@10 by 23.3%, Recall@10 by 12.2%, and NDCG@10 by 37.0%. Mixing content and CF works better than either alone (Burke, 2002). Figure 8 compares all models."),
      p("Hybrid RMSE (1.7539) and MAE (1.3893) look large but that is misleading: hybrid scores are blended 0–1 values, not 1–3 ratings. Do not compare hybrid RMSE/MAE directly to the other models. Use Hit Rate, NDCG, and Recall as the main scores."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.4 Alpha Sweep Analysis", bold: true })] }),
      p("Table 6 lists selected alpha sweep results. Figure 9 plots HR@10 and NDCG@10 versus α."),
      blankLine(),
      tableCaption(6, "Alpha Sweep: Selected Results for Key Values of α"),
      alphaSweepTable(),
      tableNote("Note. Highlighted row indicates selected operational value α = 0.5. Plateau behavior at α ∈ {0.5, 0.6, 0.7, 0.8} demonstrates robustness of performance to small deviations in the weighting parameter."),
      blankLine(),

      p("Content only (α = 0.0) gets HR@10 = 0.385 and NDCG@10 = 0.173. CF only (α = 1.0) gets HR@10 = 0.685 and NDCG@10 = 0.307, so CF is stronger on this data. Still, the hybrid at α = 0.5 beats pure CF on every metric. From α = 0.5 to 0.8 results stay flat (HR@10 ≈ 0.77), so the choice of α is not very sensitive. We use α = 0.5 as default because it is easy to explain (half CF, half content) and sits at the start of that flat region."),

      pageBreak(),

      // ── 7. SYSTEM ARCHITECTURE ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "7. System Architecture and Implementation", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "7.1 Three-Tier Architecture Overview", bold: true })] }),
      p("Claripath has three layers. First, twelve Jupyter notebooks build CSV and pickle files (clean data, similarity matrices, KNN predictions). Second, a FastAPI server loads those files at startup (loader.py) and serves login, recommendations, explanations, and admin APIs. Third, a Next.js app calls the API and shows dashboards, match percentages, and explanation charts."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "7.2 User Flows", bold: true })] }),
      p("There are two user types. Dataset users log in with a numeric ID and password test000; the server returns precomputed hybrid lists from pickle files with no extra computation. New users sign up through Supabase, get a JWT (valid 7 days), pick courses they have taken (Figure 20), then call POST /recommend/dynamic for live Jaccard CF, hybrid scoring, and explanations."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "7.3 API Endpoints", bold: true })] }),
      p("Appendix B lists all API endpoints in Table B1."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "7.4 Frontend Implementation", bold: true })] }),
      p("The Next.js 16 / React 19 frontend shows enrolled courses and recommended courses with match percentages (Figure 18). ExplainModal.jsx draws horizontal bars for SHAP and LIME per genre—green for positive, red for negative (Figure 19). Users can request an LLM paragraph for a simpler explanation. The landing page describes Claripath as a tool to help Software Engineering students plan courses with data instead of generic advising."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "7.5 Technology Stack", bold: true })] }),
      p("Technologies: scikit-learn, pandas, numpy, SHAP 0.44, and LIME 0.2 for ML; FastAPI 0.109, Uvicorn, Pydantic 2, PyJWT, and bcrypt for the API; Next.js 16, React 19, Tailwind CSS 4, Recharts, and NextAuth for the UI; Supabase PostgreSQL for storage; Docker (Python 3.11) on port 7860 for deployment."),

      pageBreak(),

      // ── 8. DISCUSSION ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "8. Discussion", bold: true })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "8.1 Key Findings", bold: true })] }),
      p("Our main results are as follows. First, predicting ratings for 181 unrated courses with Gradient Boosting helps CF a lot: User-KNN HR@10 rises from 0.6081 to 0.7059 and content coverage hits 100%. Filling gaps beats ignoring unrated courses."),
      p("Second, User-KNN beats Item-KNN everywhere. With 97.76% empty cells and only 1.54 genres per course on average, similar users are easier to find than similar courses."),
      p("Third, TF-IDF beats BoW for content filtering because it down-weights common words like Python and highlights rarer genre mixes."),
      p("Fourth, the hybrid at α = 0.5 beats both parts alone, and results stay stable from α = 0.5 to 0.8. CF captures what similar learners did; content captures course topics; together they work best."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "8.2 Trade-offs and Engineering Observations", bold: true })] }),
      p("There is a trade-off between coverage and accuracy. Content filtering reaches 100% catalogue coverage but HR@10 ≈ 0.47. The hybrid reaches HR@10 = 0.77 but only 38.76% coverage. A live system must decide whether to show more of the catalogue or focus on the best matches. Retraining CF as new users rate courses is a sensible next step."),
      p("Fixing CF normalization (Section 4.6) was important in practice. Raw KNN scores were mostly 0 or 2–3, so old scaling made the UI show only 0% or 100%. Scaling non-zero values only gives smoother match percentages."),
      p("Training a 100-tree Random Forest on 307 courses takes under 100 ms per request, so explanations can run live without storing 34,082 models—one per user."),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "8.3 Limitations", bold: true })] }),
      p("This study has limits. First, we only ran offline tests—no user study on whether explanations help trust or decisions. Ghazimatin et al. (2021) showed feedback on explanations can improve models; we did not try that."),
      p("Second, the data comes from one IBM-style platform: 3-point ratings (mostly 2 and 3), 14 genres, and likely tech-focused learners. Results may not transfer to Coursera, edX, or other scales without retesting."),
      p("Third, synthetic ratings for unrated courses may be wrong; genre and title alone cannot capture real taste. CV MAE 0.1797 is small but not zero."),
      p("Fourth, hybrid RMSE/MAE are not on the same scale as 1–3 ratings, so they should not be compared directly to other models."),
      p("Fifth, LLM explanations need external APIs and user keys, which adds cost, delay, and dependency risk."),

      pageBreak(),

      // ── 9. CONCLUSION ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "9. Conclusion and Future Work", bold: true })] }),

      p("We presented Claripath, an explainable hybrid course recommender built as a Software Engineering capstone. It tackles three problems: accurate suggestions, cold-start courses and users, and clear reasons for each recommendation. A twelve-notebook pipeline plus a web app showed that filling unrated courses with regression, mixing User-KNN and TF-IDF at α = 0.5, and explaining with SHAP/LIME on a small Random Forest gives strong offline results (HR@10 = 0.77, NDCG@10 = 0.448) and a usable product (FastAPI, Next.js, Supabase)."),
      p("Next steps include a real user study on explanations, A/B tests in production, trying matrix factorization (SVD, ALS) instead of KNN, richer course text with BERT-style embeddings, fairness checks so rare genres are not ignored, and caching explanation models per session to speed up repeat requests."),

      pageBreak(),

      // ── REFERENCES ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "References", bold: true })] }),

      ...[
        "Assami, S., Daoudi, N., & Ajhoun, R. (2020). A semantic recommendation system for learning personalization in massive open online courses. International Journal of Recent Contributions from Engineering, Science & IT (iJES), 8(1). https://doi.org/10.3991/ijes.v8i1.14229",
        "Breiman, L. (2001). Random forests. Machine Learning, 45(1), 5–32. https://doi.org/10.1023/A:1010933404324",
        "Burke, R. (2002). Hybrid recommender systems: Survey and experiments. User Modeling and User-Adapted Interaction, 12(4), 331–370. https://doi.org/10.1023/A:1021240730564",
        "Cui, Y., Chen, F., Shiri, A., & Fan, Y. (2019). Predictive analytic models of student success in higher education. Information and Learning Sciences, 120(3/4), 168–187. https://doi.org/10.1108/ILS-10-2018-0104",
        "Deepak, G., & Trivedi, I. (2023). A hybridized deep learning strategy for course recommendation. International Journal of Adult Education and Technology, 14(1). https://doi.org/10.4018/ijaet.321752",
        "Gasevic, D., Tsai, Y., Dawson, S., & Pardo, A. (2019). How do we start? An approach to learning analytics adoption in higher education. The International Journal of Information and Learning Technology, 36(4), 269–285. https://doi.org/10.1108/ijilt-02-2019-0024",
        "Ghazimatin, A., Pramanik, S., Roy, R. S., & Weikum, G. (2021). ELIXIR: Learning from user feedback on explanations to improve recommender models. Proceedings of the Web Conference 2021 (pp. 3088–3099). https://doi.org/10.1145/3442381.3449848",
        "Herlocker, J. L., Konstan, J. A., Terveen, L. G., & Riedl, J. T. (2004). Evaluating collaborative filtering recommender systems. ACM Transactions on Information Systems, 22(1), 5–53. https://doi.org/10.1145/963770.963772",
        "Injadat, M., Moubayed, A., Nassif, A. B., & Shami, A. (2021). Machine learning towards intelligent systems: Applications, challenges, and opportunities. Artificial Intelligence Review, 54, 3299–3348. https://doi.org/10.1007/s10462-020-09948-w",
        "Jia, Y. (2023). BTCBMA online education course recommendation algorithm based on learners' learning quality. International Journal of Information Technologies and Systems Approach, 16(1). https://doi.org/10.4018/ijitsa.324101",
        "Järvelin, K., & Kekäläinen, J. (2002). Cumulated gain-based evaluation of IR techniques. ACM Transactions on Information Systems, 20(4), 422–446. https://doi.org/10.1145/582415.582418",
        "Lin, J., Sun, G., Shen, J., Cui, T., Yu, P., Xu, D., Li, L., & Beydoun, G. (2019). Towards the readiness of learning analytics data for micro learning. In Services Computing – SCC 2019 (pp. 3–20). Springer. https://doi.org/10.1007/978-3-030-23554-3_5",
        "Lu, L., Medo, M., Yeung, C. H., Zhang, Y., Zhang, Z., & Zhou, T. (2012). Recommender systems. Physics Reports, 519(1), 1–49. https://doi.org/10.1016/j.physrep.2012.02.006",
        "Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. Advances in Neural Information Processing Systems, 30. https://proceedings.neurips.cc/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html",
        "Maiti, M., & Priyaadharshini, M. (2022). Recommender system for low achievers in higher education. International Journal of Information and Education Technology, 12(12), 1360–1367. https://doi.org/10.18178/ijiet.2022.12.12.1763",
        "Najmani, K., Benlahmar, E. H., Sael, N., & Zellou, A. (2022). A systematic literature review on recommender systems for MOOCs. Ingénierie des Systèmes d'Information, 27(6). https://doi.org/10.18280/isi.270605",
        "Nikolakopoulos, A. N., Kalantzis, V., Gallopoulos, E., & Garofalakis, J. D. (2018). EigenRec: Generalizing PureSVD for effective and efficient top-N recommendations. Knowledge and Information Systems, 56(3), 711–740. https://doi.org/10.1007/s10115-018-1197-7",
        "Praseptiawan, M., Muchtarom, M. F. D., Putri, N. M., Pee, A. N. C., Zakaria, M. H., & Untoro, M. C. (2024a). MOOC course recommendation system model with explainable AI (XAI) using content based filtering method. In 2024 11th International Conference on Electrical Engineering, Computer Science and Informatics (EECSI) (pp. 144–147). IEEE. https://doi.org/10.1109/EECSI63442.2024.10776491",
        "Praseptiawan, M., Putri, N. M., Muchtarom, M. F. D., Zakaria, M. H., & Pee, A. N. C. (2024b). Application of collaborative filtering and explainable AI methods in recommendation system modeling to predict MOOC course preferences. In 2024 2nd International Symposium on Information Technology and Digital Innovation (ISITDI) (pp. 228–233). IEEE. https://doi.org/10.1109/ISITDI62380.2024.10797073",
        "Ribeiro, M. T., Singh, S., & Guestrin, C. (2016). \"Why should I trust you?\": Explaining the predictions of any classifier. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining (pp. 1135–1144). https://doi.org/10.1145/2939672.2939778",
        "Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval. Information Processing & Management, 24(5), 513–523. https://doi.org/10.1016/0306-4573(88)90021-0",
        "Sapre, R., Panchal, A., Raut, H., Zarapkar, V., & Wankhade, S. (2024). Course recommendation using machine learning. International Research Journal of Engineering and Technology (IRJET), 11(8), 141–145.",
        "Sarwar, B., Karypis, G., Konstan, J., & Riedl, J. (2001). Item-based collaborative filtering recommendation algorithms. Proceedings of the 10th International Conference on World Wide Web (pp. 285–295). https://doi.org/10.1145/371920.372071",
        "Schein, A. I., Popescul, A., Ungar, L. H., & Pennock, D. M. (2002). Methods and metrics for cold-start recommendations. Proceedings of the 25th Annual International ACM SIGIR Conference on Research and Development in Information Retrieval (pp. 253–260). https://doi.org/10.1145/564376.564421",
        "Sun, P. (2023). Personalized course resource recommendation algorithm based on deep learning in the intelligent question answering robot environment. International Journal of Information Technologies and Systems Approach, 16(2). https://doi.org/10.4018/ijitsa.320188",
        "Suneetha, C., Jahnavi, M., Yashwanth, M., & Goutam, N. K. (n.d.). Course recommendation system using machine learning. Department of Electronics and Communication Engineering, Vignana Bharathi Institute of Technology.",
        "Tintarev, N., & Masthoff, J. (2012). Evaluating the effectiveness of explanations for recommender systems. User Modeling and User-Adapted Interaction, 22(4–5), 399–439. https://doi.org/10.1007/s11257-011-9117-5",
        "Uddin, I., Imran, A. S., Muhammad, K., Fayyaz, N., & Sajjad, M. (2021). A systematic mapping review on MOOC recommender systems. IEEE Access, 9, 118379–118405. https://doi.org/10.1109/access.2021.3101039",
        "Yang, Y., Cao, J., Shen, J., Yang, R., & Wen, Z. (2020). Learning analytics based on multilayer behavior fusion. In Blended Learning: Education in a Smart Learning Environment (pp. 173–183). Springer. https://doi.org/10.1007/978-3-030-51968-1_2",
      ].map(ref => new Paragraph({
        spacing: { before: 0, after: 120 },
        indent: { left: 720, hanging: 720 },
        children: [new TextRun({ text: ref, font: "Times New Roman", size: 22 })]
      })),

      pageBreak(),

      // ── LIST OF FIGURES ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "List of Figures", bold: true })] }),
      ...[
        ["1", "summary_eda_ratings.png", "Rating distribution histogram and ratings-per-user histogram across user activity buckets."],
        ["2", "summary_genre_analysis.png", "Genre frequency bar chart and genres-per-course distribution."],
        ["3", "Pipeline architecture diagram", "Overview of the Claripath end-to-end ML pipeline from raw data to deployment."],
        ["4", "eda_genre_distribution.png", "EDA-phase genre frequency horizontal bar chart across 14 binary genre categories."],
        ["5", "summary_content_based_comparison.png", "Content-based filtering: TF-IDF vs. BoW metric comparison before and after augmentation."],
        ["6", "summary_cf_comparison.png", "Collaborative filtering: User-KNN vs. Item-KNN metric comparison before and after augmentation."],
        ["7", "summary_regression_selection.png", "Regression model selection cross-validation bar chart (MAE and RMSE for four regressors)."],
        ["8", "summary_final_comparison.png", "Consolidated all-models comparison bar chart for primary ranking metrics."],
        ["9", "summary_alpha_sweep.png", "Alpha sweep: HR@10 and NDCG@10 as functions of α from 0.0 to 1.0."],
        ["10", "summary_xai_explanation.png", "SHAP and LIME genre attribution bar charts for a demonstration user."],
        ["11", "summary_final_table.png", "Results summary table visual as generated by PROJECT_SUMMARY.ipynb."],
        ["12", "content_tfidf_similarity_sample.png", "Sample TF-IDF cosine similarity heatmap for a subset of courses."],
        ["13", "predicted_unrated_distribution.png", "Distribution of Gradient Boosting predicted ratings for 181 previously unrated courses."],
        ["14", "comparison_content_{metric}.png", "Per-metric content-based filtering comparison plots (one per metric)."],
        ["15", "comparison_cf_{metric}.png", "Per-metric collaborative filtering comparison plots (one per metric)."],
        ["16", "hybrid_alpha_sweep.png", "HybridModel alpha sweep line plot from HybridModel/figures/."],
        ["17", "hybrid_model_comparison.png", "Grouped bar chart comparing all models on primary ranking metrics."],
        ["18", "screenshot_dashboard.png", "Frontend screenshot: personalized recommendation dashboard with hybrid match percentages."],
        ["19", "screenshot_explain_modal.png", "Frontend screenshot: ExplainModal with SHAP and LIME Recharts bar charts."],
        ["20", "screenshot_select_courses.png", "Frontend screenshot: cold-start course selection flow for new real users."],
      ].map(([num, file, desc]) => new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({ text: `Figure ${num}: `, bold: true, font: "Times New Roman", size: 22 }),
          new TextRun({ text: `[Insert ${file}] `, italics: true, font: "Times New Roman", size: 22, color: "888888" }),
          new TextRun({ text: desc, font: "Times New Roman", size: 22 }),
        ]
      })),

      pageBreak(),

      // ── LIST OF TABLES ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "List of Tables", bold: true })] }),
      ...[
        ["1", "Dataset Summary Statistics"],
        ["2", "Regression Model Selection via 5-Fold Cross-Validation"],
        ["3", "Content-Based Filtering Results Before and After Augmentation"],
        ["4", "Collaborative Filtering Results Before and After Augmentation"],
        ["5", "Hybrid Model Comparison Against Component Baselines"],
        ["6", "Alpha Sweep: Selected Results for Key Values of α"],
        ["A1", "Complete Hyperparameter Summary"],
        ["B1", "FastAPI Endpoint Reference"],
      ].map(([num, desc]) => new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({ text: `Table ${num}: `, bold: true, font: "Times New Roman", size: 22 }),
          new TextRun({ text: desc, font: "Times New Roman", size: 22 }),
        ]
      })),

      pageBreak(),

      // ── APPENDIX A ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Appendix A: Hyperparameter Summary", bold: true })] }),
      p("Table A1 lists all key hyperparameters used across the Claripath pipeline, together with their values and the pipeline phase in which they apply."),
      blankLine(),
      tableCaption("A1", "Complete Hyperparameter Summary"),
      hyperparamTable(),

      pageBreak(),

      // ── APPENDIX B ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Appendix B: API Endpoint Reference", bold: true })] }),
      p("Table B1 lists all FastAPI endpoints exposed by the Claripath backend, organized by functional category. All endpoints operate over HTTP/HTTPS on port 8000. Protected endpoints require a valid JWT Bearer token in the Authorization header."),
      blankLine(),
      tableCaption("B1", "FastAPI Endpoint Reference"),
      apiEndpointsTable(),

      pageBreak(),

      // ── APPENDIX C ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Appendix C: Notebook Execution Order", bold: true })] }),
      p("The following execution order must be followed to reproduce all reported results from the raw dataset files:"),
      blankLine(),
      ...[
        "01_EDA_Clean.ipynb — Load raw data, perform EDA, remove duplicates, output cleaned_courses.csv",
        "02_Content_Based_Before_Clean.ipynb — TF-IDF and BoW content-based filtering on rated courses only",
        "03_Collaborative_Filtering_Before_Clean.ipynb — User-KNN and Item-KNN on original sparse matrix",
        "04_Predict_Unrated_And_Merge_Clean.ipynb — Regression augmentation; output ratings_full_with_predictions.csv",
        "05_Content_Based_After_Clean.ipynb — Content-based filtering re-evaluation on augmented dataset",
        "06_Collaborative_Filtering_After_Clean.ipynb — CF re-training and evaluation on augmented matrix",
        "07_Final_Comparison_Clean.ipynb — Side-by-side metric comparison; export figures",
        "FINAL_FIXED_TFIDF_BOW.ipynb — Corrected TF-IDF/BoW comparison with normalization fixes",
        "HybridModel/H1_Hybrid_Recommender.ipynb — Hybrid model construction, alpha sweep, results export",
        "HybridModel/H2_Explainability.ipynb — SHAP/LIME surrogate training and explanation generation",
        "HybridModel/H3_LLM_Explanations.ipynb — LLM narrative layer integration and testing",
        "generate_summary_notebook.py → PROJECT_SUMMARY.ipynb — Automated professor-facing summary notebook",
      ].map((text, i) => new Paragraph({
        numbering: { reference: "numbers", level: 0 },
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text, font: "Times New Roman", size: 22 })]
      })),

    ]
  }]
});

const OUT = path.join(__dirname, '..', 'Claripath_Research_Paper_APA.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUT, buffer);
  console.log("Done! File written to:", OUT);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
})