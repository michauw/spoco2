import re
import sys
from collections import defaultdict
from string import punctuation
from math import log, sqrt

def pos_allowed_nkjp (pos, allowed):
    if pos in 'fin praet aglt bedzie inf imps impt pact ppas pcon pant ger winien'.split ():
        pos = 'verb'
    elif pos in 'subst depr ger ppron12 ppron3'.split ():
        pos = 'noun'
    elif pos != 'adj':
        pos = 'rest'
    
    return pos in allowed

def get_words (text):
    if not text:
        return []
    return [w for w in text.strip ().split (' ')]
    

def get_window_words (input_words, window_size, direction):
    words = []
    for word in input_words[::direction][:window_size]:
        if word and word not in punctuation:
            words.append (word)
        elif not word:
            continue
        else:
            break

    return words

def pmi (xy, x, y, N):
    return log (xy / N / (x * y / N ** 2), 2)

def t_score (xy, x, y, N):
    expected = x * y / N
    return (xy - expected) / sqrt (xy) if xy > 0 else 0

def log_likelihood_ratio (xy, x, y, N):
    o11 = xy
    o12 = x - xy
    o21 = y - xy
    o22 = N - x - y + xy

    row1 = o11 + o12
    row2 = o21 + o22
    col1 = o11 + o21
    col2 = o12 + o22

    e11 = row1 * col1 / N
    e12 = row1 * col2 / N
    e21 = row2 * col1 / N
    e22 = row2 * col2 / N

    def safe_log (o, e):
        return o * log(o / e) if o > 0 and e > 0 else 0

    return 2 * (
        safe_log (o11, e11) +
        safe_log (o12, e12) +
        safe_log (o21, e21) +
        safe_log (o22, e22)
    )

def dice (xy, x, y, N):
    denom = x + y
    return 2 * xy / denom if denom > 0 else 0

def chi_square (xy, x, y, N):
    o11 = xy
    o12 = x - xy
    o21 = y - xy
    o22 = N - x - y + xy

    e11 = x * y / N
    e12 = x * (N - y) / N
    e21 = (N - x) * y / N
    e22 = (N - x) * (N - y) / N

    def safe_term (o, e):
        return (o - e) ** 2 / e if e > 0 else 0

    return safe_term (o11, e11) + safe_term (o12, e12) + safe_term (o21, e21) + safe_term (o22, e22)


def get_collocations (lines, freq, N, case_sensitive, assoc_measures = ['pmi'], window_size = 1, frequency_threshold = 5):

    patttern_html = r'.*</EM>(.*)<B>.*?</B>(.*)'
    frequencies = defaultdict (int)
    for line in lines:
        line = line.strip ()
        if not line:
            continue
        data = re.search (patttern_html, line)
        left_context, right_context = data.groups ()
        lc_words = get_window_words ([w for w in left_context.strip ().split (' ')], window_size, -1)
        rc_words = get_window_words ([w for w in right_context.strip ().split (' ')], window_size, 1)
        for word in lc_words + rc_words:
            frequencies[word] += 1
    res = {}
    x = len (lines)
    for word, xy in frequencies.items ():
        if xy <= frequency_threshold:
            continue
        try:
            word = word.lower () if case_sensitive else word
            y = freq[word]
            if not y:   # if freq is defaultdict, it won't throw KeyError when a key is not present
                raise KeyError (word)
        except KeyError:
            print (f'(get_collocations) warning: word "{word}" not found in the frequency dict')
            continue
        res[word] = []
        for am in assoc_measures:
            amf = getattr (sys.modules[__name__], am)
            res[word].append (amf (xy, x, y, N))
        res[word].append (xy)
    
    return sorted ([[k] + v for k, v in res.items ()], key = lambda x: -x[1])

def get_frequency (lines, frequency_filter = 0):
    patttern_html = r'^<TR><TD>.*?<TD>(.*?)<TD>(.*?)</TR>'
    res = []
    for line in lines:
        try:
            token, freq = re.search (patttern_html, line).groups ()
            freq = int (freq)
        except AttributeError:
            continue
        if freq > frequency_filter:
            res.append ((token, freq))
    
    return res
    



        
