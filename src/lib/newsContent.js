/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

/** @param {unknown} color */
export function normalizeThemeColor(color) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#b91c1c';
}

/** Format trusted markup around escaped plain text; input HTML is never accepted.
 * @param {unknown} rawText
 * @param {unknown} themeColor
 */
export function formatNewsContent(rawText, themeColor) {
    if (!rawText) return '';
    rawText = String(rawText);
    themeColor = normalizeThemeColor(themeColor);

    // పేరాగ్రాఫ్‌ల వారీగా విభజించడం
    const paragraphs = rawText.split(/\n\s*\n/);

    return paragraphs.map((para, pIdx) => {
      let lines = para.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';

      // A. బుల్లెట్ పాయింట్లు ఉంటే Eenadu మోడల్ "ముఖ్యాంశాలు" కలర్ బాక్స్
      const isBulletList = lines.every(l => /^([•\-\*■✦]|\d+[\.\)])\s*/.test(l));
      if (isBulletList) {
        const itemsHtml = lines.map(l => {
          const clean = l.replace(/^([•\-\*■✦]|\d+[\.\)])\s*/, '');
          const formatted = applyInlineColors(clean, themeColor);
          return `<li style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: ${themeColor}; font-weight: 900; font-size: 13px; line-height: 1.3;">✦</span>
            <span>${formatted}</span>
          </li>`;
        }).join('');

        return `<div style="background-color: #fff9f5; border-left: 4px solid ${themeColor}; border-radius: 0 12px 12px 0; padding: 12px 16px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size: 12px; font-weight: 900; color: ${themeColor}; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
            <span>📌</span> <span>ముఖ్యాంశాలు (Key Highlights):</span>
          </div>
          <ul style="list-style: none; padding: 0; margin: 0; font-weight: 600; color: #1e293b; line-height: 1.6;">
            ${itemsHtml}
          </ul>
        </div>`;
      }

      // B. చిన్న సింగిల్ లైన్ ఉంటే ఆటోమేటిక్ అంతర శీర్షిక (Colored Subheading)
      if (lines.length === 1 && lines[0].length < 65 && !lines[0].endsWith('.') && (lines[0].endsWith(':') || lines[0].endsWith('?') || !lines[0].includes('.'))) {
        return `<h3 style="color: ${themeColor}; font-size: 17.5px; font-weight: 900; margin: 22px 0 10px 0; font-family: 'Ramabhadra', sans-serif; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 5px; height: 18px; background-color: ${themeColor}; border-radius: 3px;"></span>
          <span>${applyInlineColors(lines[0], themeColor)}</span>
        </h3>`;
      }

      // C. సాధారణ పేరాగ్రాఫ్ (ఇన్‌లైన్ రంగులతో)
      const paraText = lines.join(' ');
      const formattedPara = applyInlineColors(paraText, themeColor);

      if (pIdx === 0) {
        // మొదటి లీడ్ పేరా కాస్త ముదురు రంగులో
        return `<p style="margin-bottom: 14px; color: #0f172a; font-weight: 600; text-align: justify; line-height: 1.75;">${formattedPara}</p>`;
      }

      return `<p style="margin-bottom: 14px; color: #1e293b; text-align: justify; line-height: 1.75;">${formattedPara}</p>`;
    }).join('');
  }

  // ఇన్‌లైన్ కలర్ ట్యాగ్స్ ప్రాసెసింగ్ ([red], [blue], *పదం*)
/** @param {unknown} text @param {unknown} themeColor */
export function applyInlineColors(text, themeColor) {
    themeColor = normalizeThemeColor(themeColor);
    return escapeHtml(text)
      .replace(/\[red\](.*?)\[\/red\]/gi, `<span style="color: #dc2626; font-weight: 800;">$1</span>`)
      .replace(/\[blue\](.*?)\[\/blue\]/gi, `<span style="color: #1d4ed8; font-weight: 800;">$1</span>`)
      .replace(/\[green\](.*?)\[\/green\]/gi, `<span style="color: #047857; font-weight: 800;">$1</span>`)
      .replace(/\[orange\](.*?)\[\/orange\]/gi, `<span style="color: #ea580c; font-weight: 800;">$1</span>`)
      .replace(/\[purple\](.*?)\[\/purple\]/gi, `<span style="color: #7c3aed; font-weight: 800;">$1</span>`)
      .replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${themeColor}; font-weight: 800;">$1</strong>`)
      .replace(/\*([^*\n]+)\*/g, `<strong style="color: ${themeColor}; font-weight: 800;">$1</strong>`);
  }

