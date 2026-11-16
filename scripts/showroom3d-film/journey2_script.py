# -*- coding: utf-8 -*-
"""The owner's Arabic script for film v2 (verbatim, two typos fixed by the coordinator: 'استراتيجية', 'ومن هنا'),
one entry per line (a line break is a pause), plus a faithful English translation used only for journey2.en.vtt.
The stage direction in the owner's script ("wide shots of the factory ... ") is NOT narration; it is the visual beat STAGE_DIRECTION.
Alignment of the lines to the narration audio (word timings): see align_lines()."""
import difflib
import json
import re

LINES = [
    ("أن تصبح الفكرة مصنعًا…", "For an idea to become a factory…"),
    ("كانت خطًا على ورقة.", "it was once a line on a sheet of paper."),
    ("وفي البحرين، من ورشة خشب صغيرة، بدأت رحلتنا.", "And in Bahrain, from a small woodworking workshop, our journey began."),
    ("أدوات بسيطة… أفكار كثيرة… وطموح يكبر مع كل قطعة نصنعها.", "Simple tools… many ideas… and an ambition that grows with every piece we make."),
    ("ومع كل خطوة، كبر الحلم.", "And with every step, the dream grew."),
    ("من ورشة صغيرة إلى مصنعين متكاملين، مجهزين بأحدث المكائن والتقنيات الأوروبية.", "From a small workshop to two integrated factories, equipped with the latest European machinery and technologies."),
    ("ومن أول مشروع… إلى أكثر من خمسين ألف مشروع، امتدت أعمالنا من خلالها إلى دول الخليج والعراق والأردن.", "From our first project… to more than fifty thousand projects, through which our work reached the Gulf countries, Iraq and Jordan."),
    ("تركنا بصمتنا في مشاريع بارزة؛ منها مراسي البحرين، ودرة البحرين، وواتر باي، والعديد من المشاريع الإسكانية الحكومية.", "We left our mark on prominent projects, among them Marassi Al Bahrain, Durrat Al Bahrain, Water Bay, and many government housing projects."),
    ("كل مشروع أضاف إلى خبرتنا…", "Every project added to our experience…"),
    ("وكل تحدٍّ فتح أمامنا فكرة جديدة.", "and every challenge opened a new idea for us."),
    ("ثم جاءت جائحة كورونا.", "Then came the coronavirus pandemic."),
    ("اضطربت سلاسل الإمداد، وأصبح الوصول إلى المواد تحديًا.", "Supply chains were disrupted, and getting hold of materials became a challenge."),
    ("وهنا سألنا أنفسنا:", "And so we asked ourselves:"),
    ("ماذا لو صنعناها هنا… في البحرين؟", "What if we made it here… in Bahrain?"),
    ("من هذا السؤال، وُلد «مصنع ياس».", "From that question, “Yas Factory” was born."),
    ("الأول من نوعه في البحرين لإنتاج وتكسية الألواح الخشبية.", "The first of its kind in Bahrain for producing and cladding wood panels."),
    ("حوّلنا تحدّي التوريد إلى قدرة صناعية؛ نتحكم من خلالها في الجودة، ونطوّر منتجاتنا، ونفتح أبوابًا جديدة للتصدير.", "We turned the supply challenge into an industrial capability; through it we control quality, develop our products, and open new doors for export."),
    ("ومن البحرين، انطلقت منتجاتنا إلى المنطقة.", "And from Bahrain, our products set out to the region."),
    ("اتفاقيات توزيع تغطي جميع دول الخليج، بالإضافة إلى العراق والأردن.", "Distribution agreements covering all the Gulf countries, in addition to Iraq and Jordan."),
    ("وتصاميم وألوان حصرية على مستوى العالم، تمنح المصممين والمصنّعين خيارات تحمل بصمتنا.", "And exclusive designs and colours worldwide, giving designers and manufacturers options that carry our signature."),
    ("وامتد ابتكارنا إلى التفاصيل.", "And our innovation extended to the details."),
    ("أكثر من سبع وعشرين براءة اختراع لبروفايلات الألمنيوم، صممها وطوّرها فريقنا؛ حلول بدأت من احتياج عملي، وتحولت إلى منتجات خاصة بنا.", "More than twenty-seven patents for aluminium profiles, designed and developed by our team; solutions that began from a practical need and became products of our own."),
    ("واليوم… نفتح فصلًا جديدًا.", "And today… we open a new chapter."),
    ("صفقات واتفاقيات جديدة، وشراكات توسّع حضورنا، وفرص تفتح أمام منتجاتنا أسواقًا أكبر.", "New deals and agreements, partnerships that widen our presence, and opportunities that open larger markets for our products."),
    ("وخلف هذا النمو، فريق نستثمر في قدراته، وعمليات نطوّر كفاءتها، ومنظومة رقمية نعمل على ربطها بالإنتاج والمخزون والمبيعات وسلاسل التوريد.", "And behind this growth, a team whose capabilities we invest in, processes whose efficiency we develop, and a digital system we are working to connect with production, inventory, sales and supply chains."),
    ("القدرة موجودة.", "The capability is there."),
    ("والخبرة تراكمت.", "The experience has accumulated."),
    ("وأمامنا مساحة أكبر للنمو.", "And we have more room to grow."),
    ("وهنا تبدأ فرصة الاستثمار في مصنعنا.", "And here begins the opportunity to invest in our factory."),
    ("لاستغلال طاقتنا الإنتاجية العالية، وتطوير منتجات جديدة، والانطلاق بصادراتنا إلى أسواق العالم.", "To make use of our high production capacity, develop new products, and take our exports to the world's markets."),
    ("ومن هنا نتطلع إلى شراكة استراتيجية تشاركنا الرؤية، ليسهم معنا في تحويل هذه الفرص إلى نتائج ملموسة، بخطة واضحة وأهداف قابلة للقياس.", "And from here we look forward to a strategic partnership that shares our vision, to contribute with us to turning these opportunities into tangible results, with a clear plan and measurable goals."),
    ("من فكرة على ورقة…", "From an idea on paper…"),
    ("إلى صناعة تتجاوز الحدود.", "to an industry that goes beyond borders."),
    ("نصنع اليوم، ونستثمر في الغد.", "We make today, and invest in tomorrow."),
]
# the owner's stage direction (NOT narration, never read aloud): it sits between line 25 and line 26 and describes a visual beat
STAGE_DIRECTION = "[لقطات واسعة للمصنع والطاقة الإنتاجية، تتخللها تفاصيل المنتج النهائي]"
STAGE_DIRECTION_AFTER_LINE = 25     # 1-based: it follows line 25 ("... وسلاسل التوريد.")
TRANSLATION_NOTE = "Translation of the Arabic narration (English captions are a translation, not the spoken language)."

_TASHKEEL = re.compile(r"[ً-ْٰـ]")


def norm(w):
    w = _TASHKEEL.sub("", w)
    w = re.sub(r"[^\w]", "", w)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ؤ", "و"), ("ئ", "ي")):
        w = w.replace(a, b)
    return w


def script_tokens():
    out = []
    for li, (ar, _) in enumerate(LINES):
        for tok in ar.split():
            n = norm(tok)
            if n:
                out.append((li, n))
    return out


LAST_TOKENS = []


def align_lines(words):
    """words: [{w,s,e}] from the speech recogniser (times in the narration file). -> per line {s, e, matched, total}.
    Script tokens are matched to recognised words in order (difflib); unmatched tokens are interpolated between matched neighbours."""
    st = script_tokens()
    a = [t for _, t in st]
    b = [norm(w["w"]) for w in words]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    ts = [None] * len(a)
    te = [None] * len(a)
    matched = 0
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            ts[blk.a + k] = words[blk.b + k]["s"]
            te[blk.a + k] = words[blk.b + k]["e"]
            matched += 1
    # fuzzy fill for the unmatched script tokens: same position, similar spelling inside the gap
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "replace" and i2 - i1 == j2 - j1:
            for k in range(i2 - i1):
                if difflib.SequenceMatcher(None, a[i1 + k], b[j1 + k]).ratio() >= 0.5:
                    ts[i1 + k], te[i1 + k] = words[j1 + k]["s"], words[j1 + k]["e"]
    # interpolate the rest
    known = [i for i, v in enumerate(ts) if v is not None]
    for i in range(len(a)):
        if ts[i] is None:
            lo = max([k for k in known if k < i], default=None)
            hi = min([k for k in known if k > i], default=None)
            if lo is None:
                ts[i] = te[i] = ts[hi]
            elif hi is None:
                ts[i] = te[i] = te[lo]
            else:
                f = (i - lo) / (hi - lo)
                ts[i] = te[lo] + (ts[hi] - te[lo]) * f
                te[i] = ts[i]
    global LAST_TOKENS
    LAST_TOKENS = [(st[i][0], ts[i], te[i]) for i in range(len(st))]     # per script token: (line index, start, end) in narration time
    lines = []
    for li in range(len(LINES)):
        idx = [i for i, (l, _) in enumerate(st) if l == li]
        lines.append({"s": ts[idx[0]], "e": te[idx[-1]], "tokens": len(idx), "matched": sum(1 for i in idx if i in set(known))})
    return lines, matched, len(a)


if __name__ == "__main__":
    import sys
    w = json.load(open(sys.argv[1], encoding="utf-8"))["words"]
    lines, m, n = align_lines(w)
    print(f"matched {m}/{n} script tokens")
    for i, l in enumerate(lines, 1):
        print(i, round(l["s"], 2), round(l["e"], 2), f'{l["matched"]}/{l["tokens"]}')
