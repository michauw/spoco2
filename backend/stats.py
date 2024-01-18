import re
from collections import defaultdict
from string import punctuation
from math import log

def pos_allowed_nkjp (pos, allowed):
    if pos in 'fin praet aglt bedzie inf imps impt pact ppas pcon pant ger winien'.split ():
        pos = 'verb'
    elif pos in 'subst depr ger ppron12 ppron3'.split ():
        pos = 'noun'
    elif pos != 'adj':
        pos = 'rest'
    
    return pos in allowed

def get_words (text, pattr_no, allowed_pos):
    words = []
    text = text.strip ()
    if not text:
        return []
    for text_word in text.strip ().split (' '):
        layers = text_word.split ('\t')
        if allowed_pos:
            pos = layers[2].split (':')[0]
            if not pos_allowed_nkjp (pos, allowed_pos):
                words.append (None)
                continue
        words.append (layers[pattr_no])
        
    return words

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

def get_collocations (lines, pattr_no, freq, window_size = 1, frequency_threshold = 5, allowed_pos = []):

    assoc_measure = pmi
    patttern_html = r'.*</EM>(.*)<B>.*?</B>(.*)'
    frequencies = defaultdict (int)
    for line in lines:
        line = line.strip ()
        if not line:
            continue
        data = re.search (patttern_html, line)
        left_context, right_context = data.groups ()
        lc_words = get_window_words (get_words (left_context.strip (), pattr_no, allowed_pos), window_size, -1)
        rc_words = get_window_words (get_words (right_context.strip (), pattr_no, allowed_pos), window_size, 1)
        for word in lc_words + rc_words:
            frequencies[word] += 1
    res = {}
    x = len (lines)
    for word, xy in frequencies.items ():
        if xy <= frequency_threshold:
            continue
        try:
            y = freq[word]
        except KeyError:
            print (f'(get_collocations) warning: word {word} not found in frequency dict')
            continue
        N = freq['corpus_size']
        res[word] = (assoc_measure (xy, x, y, N), xy)
    
    return sorted ([(el[0], el[1][0], el[1][1]) for el in res.items ()], key = lambda x: -x[1])

def get_frequency (lines, attribute, frequency_filter = 0):
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
    



        
