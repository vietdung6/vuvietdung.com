<?php
declare(strict_types=1);

/**
 * Shared v2 formatter for the editor preview and the future chapter reader.
 * Only a minimal prose HTML vocabulary survives sanitization.
 */
function v2_sanitize_html(string $source): string {
    if (!class_exists(DOMDocument::class)) {
        throw new RuntimeException('PHP DOM extension is required for rich-text editing.');
    }
    $doc = new DOMDocument('1.0', 'UTF-8');
    $previous = libxml_use_internal_errors(true);
    try {
        $loaded = $doc->loadHTML(
            '<?xml encoding="UTF-8"?><html><body><div id="v2-root">' . $source . '</div></body></html>',
            LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
        );
        if (!$loaded) throw new DomainException('Không đọc được HTML của chương.');
        $root = $doc->getElementsByTagName('div')->item(0);
        if (!$root instanceof DOMElement) throw new DomainException('Định dạng HTML không hợp lệ.');
        $result = '';
        foreach ($root->childNodes as $child) {
            $safe = v2_clean_node($child, $doc);
            if ($safe !== null) $result .= $doc->saveHTML($safe);
        }
        return $result;
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
    }
}

function v2_clean_node(DOMNode $node, DOMDocument $doc): ?DOMNode {
    if ($node instanceof DOMText) return $doc->createTextNode($node->nodeValue ?? '');
    if (!$node instanceof DOMElement) return null;
    $name = strtolower($node->tagName);
    if (in_array($name, [
        'script','style','iframe','object','embed','svg','math','form','input',
        'button','link','meta','video','audio','picture','img','base','template'
    ], true)) return null;

    // Convert Word/Docs wrappers into plain prose; remove foreign attributes.
    $tag = match ($name) {
        'b' => 'strong', 'i' => 'em', 'div','section','article' => 'p',
        'p','br','strong','em','u','span','blockquote','h3','hr' => $name,
        default => 'span'
    };
    $safe = $doc->createElement($tag);
    $class = strtolower(trim($node->getAttribute('class')));
    $style = strtolower($node->getAttribute('style'));
    $style = preg_replace('/\s+/', '', $style) ?? '';
    if ($tag === 'p') {
        foreach (['scene-break','center-red','beat'] as $token) {
            if (preg_match('/(?:^|\s)' . preg_quote($token,'/') . '(?:\s|$)/', $class)) {
                $safe->setAttribute('class', $token);
                break;
            }
        }
        // Formatting from common rich text editors.
        if (!$safe->hasAttribute('class') && str_contains($style, 'text-align:center')) {
            if (str_contains($style,'#e53935') || str_contains($style,'rgb(229,57,53)')) {
                $safe->setAttribute('class', 'center-red');
            } elseif (str_contains($style,'#c9a96e') || str_contains($style,'rgb(201,169,110)')) {
                $safe->setAttribute('class', 'beat');
            }
        }
    }
    if ($tag === 'span' || $tag === 'strong') {
        // Native contenteditable may emit <font color> for foreColor.
        $fontColor = strtolower(trim($node->getAttribute('color')));
        $color = '';
        if (preg_match('/(?:^|\s)highlight-red(?:\s|$)/', $class)
            || $fontColor === '#e53935' || $fontColor === 'rgb(229,57,53)'
            || str_contains($style,'color:#e53935') || str_contains($style,'color:rgb(229,57,53)')) {
            $color = 'highlight-red';
        } elseif (preg_match('/(?:^|\s)highlight-bright(?:\s|$)/', $class)
            || $fontColor === '#f5f2eb' || $fontColor === 'rgb(245,242,235)'
            || str_contains($style,'color:#f5f2eb') || str_contains($style,'color:rgb(245,242,235)')) {
            $color = 'highlight-bright';
        }
        if ($color !== '') $safe->setAttribute('class', $color);
    }
    if (in_array($tag, ['br','hr'], true)) return $safe;
    foreach ($node->childNodes as $child) {
        $clean = v2_clean_node($child, $doc);
        if ($clean !== null) $safe->appendChild($clean);
    }
    // Keep pasted bold and italic from Word/Docs without their arbitrary CSS.
    if ($tag === 'span') {
        if (preg_match('/font-weight:(?:bold|[6-9]00)/', $style)) {
            $bold = $doc->createElement('strong');
            while ($safe->firstChild) $bold->appendChild($safe->firstChild);
            $safe->appendChild($bold);
        }
        if (str_contains($style, 'font-style:italic')) {
            $italic = $doc->createElement('em');
            while ($safe->firstChild) $italic->appendChild($safe->firstChild);
            $safe->appendChild($italic);
        }
    }
    return $safe;
}

function v2_text_visible(string $body, string $format): bool {
    if ($format === 'html') {
        $body = v2_sanitize_html($body);
        // Scene dividers alone do not constitute a publishable chapter.
        $body = preg_replace('/<p class="scene-break">.*?<\/p>/su', '', $body) ?? $body;
        $visible = html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return preg_replace('/[\p{Z}\s\x{200B}\x{FEFF}]+/u', '', $visible) !== '';
    }
    return trim($body) !== '';
}

function v2_noir_inline(string $text): string {
    $text = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $text = preg_replace('/\*\*(.+?)\*\*/su', '<strong class="highlight-bright">$1</strong>', $text);
    $text = preg_replace('/\*([^*]+)\*/su', '<span class="highlight-red">$1</span>', $text);
    return nl2br($text, false);
}

function v2_noir_html(string $text): string {
    if (trim($text) === '') return '';
    $blocks = preg_split(preg_match('/\R\s*\R/u', $text) ? '/(?:\R\s*){2,}/u' : '/\R+/u', $text);
    $html = '';
    foreach ($blocks as $block) {
        $value = trim($block);
        if ($value === '') continue;
        if (preg_match('/^[*\-✦_.]{3,}$/u', str_replace(' ','',$value))) {
            $html .= '<p class="scene-break">✦ ✦ ✦</p>';
        } elseif (preg_match('/^\*([^*]+)\*$/us', $value, $matches)) {
            $html .= '<p class="center-red">' . v2_noir_inline(trim($matches[1])) . '</p>';
        } elseif (preg_match('/^[^\s.]+\.$/u', $value)) {
            $html .= '<p class="beat">' . v2_h($value) . '</p>';
        } else {
            $html .= '<p>' . v2_noir_inline($value) . '</p>';
        }
    }
    return $html;
}

function v2_read_html(string $body, string $format): string {
    return $format === 'noir_text' ? v2_noir_html($body) : v2_sanitize_html($body);
}
