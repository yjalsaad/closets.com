/* [IKHTARHA GAMES 2026-11-21] Standard terms & conditions of the Games Hub.
 * One clause per line, written "Title: text". {min} is replaced by the minimum purchase amount set in Bonsai
 * (Campaign › Games › Setup). The same file lives in the website (src/games/terms.js) and in Bonsai
 * (src/campaigns/ikhtarha/gamesTerms.js): Bonsai uses it for "Load standard terms", the website when no terms were saved. */
export const DEFAULT_MIN = 500;

export const TERMS_EN = [
  'Who can play: The games are open to customers of The Closets International (the "Company") who enter with their own name and mobile number, and a quotation number when the Company asks for one. Each game can be played the number of times shown on the screen.',
  'Prizes: Prizes are drawn by the Company\'s system at the moment of play. The result shown on the winning ticket is final and cannot be changed or played again.',
  'Minimum purchase: A prize is valid only when the winner buys products from the Company worth not less than BD {min} in one order. Below this amount the prize cannot be used.',
  'Validity: The prize must be used before the "valid until" date on the winning ticket. An expired prize cannot be used or extended, except with written approval from management.',
  'How it is used: The prize is used once, when the order is confirmed (signed agreement and first payment). Show the winning ticket, printed or on your phone, with the same mobile number; our team verifies the winning code.',
  'Discounts: Percentage and fixed discounts are applied by the system to the value of the order. If the order value changes, the discount is recalculated on the final value.',
  'Gifts and products: Gift and product prizes are delivered or installed with the order. If an item is not available, the Company may replace it with an equivalent item of the same or higher value. Manufacturer warranty applies.',
  'Personal prize: The prize is linked to the winner\'s name and mobile number. It cannot be transferred, sold or given to another person.',
  'No cash value: Prizes cannot be exchanged for cash, credit or refunds, and no change is given. They cannot be combined with other offers unless the Company approves it in writing.',
  'More than one prize: Each prize has its own winning code, and each follows these terms separately.',
  'Cancellation: If the order is cancelled or refunded, the prize is cancelled. Prizes from altered, copied or misused tickets, from repeated entries, or from false information are void.',
  'Your data: The name, mobile number and quotation number are used only to run the games and verify the prize.',
  'Changes and disputes: The Company may change these terms or end the games at any time; prizes already won stay valid until their date. In any dispute the decision of the Company\'s management is final, under the laws of the Kingdom of Bahrain.',
].join('\n');

export const TERMS_AR = [
  'من يمكنه اللعب: الألعاب متاحة لعملاء الخزائن العالمية ("الشركة") الذين يدخلون باسمهم ورقم جوالهم، ورقم عرض السعر عندما تطلبه الشركة. تُلعب كل لعبة بعدد المرات الموضح على الشاشة.',
  'الجوائز: تُسحب الجوائز آليًا من نظام الشركة لحظة اللعب. النتيجة الظاهرة على تذكرة الفوز نهائية ولا يمكن تغييرها أو إعادة اللعب.',
  'الحد الأدنى للشراء: الجائزة صالحة فقط عند شراء الفائز منتجات من الشركة بقيمة لا تقل عن {min} دينار بحريني في طلب واحد، ولا يمكن استخدامها لمبلغ أقل من ذلك.',
  'الصلاحية: يجب استخدام الجائزة قبل تاريخ "صالحة حتى" المذكور على تذكرة الفوز. لا يمكن استخدام الجائزة المنتهية أو تمديدها إلا بموافقة كتابية من الإدارة.',
  'طريقة الاستخدام: تُستخدم الجائزة مرة واحدة فقط عند تأكيد الطلب (توقيع الاتفاقية والدفعة الأولى). اعرض تذكرة الفوز مطبوعة أو على جوالك مع نفس رقم الجوال، ويتحقق فريقنا من رمز الفوز.',
  'الخصومات: تُطبَّق خصومات النسبة والمبلغ الثابت من خلال النظام على قيمة الطلب. إذا تغيّرت قيمة الطلب يُعاد احتساب الخصم على القيمة النهائية.',
  'الهدايا والمنتجات: تُسلَّم الهدايا والمنتجات أو تُركَّب مع الطلب. في حال عدم توفر الصنف يحق للشركة استبداله بصنف مماثل بنفس القيمة أو أعلى. يسري ضمان المصنّع.',
  'جائزة شخصية: الجائزة مرتبطة باسم الفائز ورقم جواله، ولا يجوز نقلها أو بيعها أو منحها لشخص آخر.',
  'لا قيمة نقدية: لا يمكن استبدال الجوائز بمبلغ نقدي أو رصيد أو استرداد، ولا يُعاد فرق. ولا يجوز جمعها مع عروض أخرى إلا بموافقة كتابية من الشركة.',
  'أكثر من جائزة: لكل جائزة رمز فوز خاص بها، وتخضع كل جائزة لهذه الشروط بشكل مستقل.',
  'الإلغاء: في حال إلغاء الطلب أو استرداد قيمته تُلغى الجائزة. وتُعتبر لاغية الجوائز الناتجة عن تذاكر معدّلة أو منسوخة أو مُساء استخدامها، أو عن تكرار الدخول، أو عن معلومات غير صحيحة.',
  'بياناتك: يُستخدم الاسم ورقم الجوال ورقم عرض السعر لإدارة الألعاب والتحقق من الجائزة فقط.',
  'التعديلات والنزاعات: يحق للشركة تعديل هذه الشروط أو إنهاء الألعاب في أي وقت، وتبقى الجوائز التي تم الفوز بها صالحة حتى تاريخها. في أي نزاع يكون قرار إدارة الشركة نهائيًا وفق قوانين مملكة البحرين.',
].join('\n');

/** amount as shown to customers: 500, 750.5 … (no trailing zeros) */
export const minOf = (v) => { const n = Number(v); return v == null || v === '' || !Number.isFinite(n) || n < 0 ? DEFAULT_MIN : n; };
export const minText = (v) => String(Math.round(minOf(v) * 1000) / 1000);

/** saved text (or the standard one) → [{ title, body }] with {min} filled in */
export function termsOf(saved, ar, min) {
  const src = String(saved || '').trim() || (ar ? TERMS_AR : TERMS_EN);
  const none = minOf(min) === 0; // 0 = no minimum: the clauses that mention it are left out
  return src.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !(none && /\{min\}/.test(l))).map((l) => {
    const line = l.replace(/\{min\}/g, minText(min));
    const m = line.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
    return m ? { title: m[1].trim(), body: m[2].trim() } : { title: '', body: line };
  });
}
