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

def get_collocations (lines, freq, N, case_sensitive, window_size = 1, frequency_threshold = 5):

    
    assoc_measure = pmi
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
        res[word] = (assoc_measure (xy, x, y, N), xy)
    
    return sorted ([(el[0], el[1][0], el[1][1]) for el in res.items ()], key = lambda x: -x[1])

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
    



        
