import os
import re
import subprocess as sb
from collections import defaultdict

class CorpusData:

    def __init__ (self, corpus_name, registry_path, cwb_bin_path = '', svalues = False, frequency = False):

        self.registry = registry_path
        self.cwb = cwb_bin_path
        self.name = corpus_name.lower ()
        self.id = corpus_name.upper ()
        self.pattrs = []
        self.sattrs = []
        self.sattr_values = {}
        self.frequency = {}
        self.size = 0
        self.analyze_corpus_structure ()
        if svalues:
            self.sattr_values = self.get_sattr_values ()
        if frequency:
            self.frequency = self.get_frequency ()

    def analyze_corpus_structure (self):
        patterns = [r'^ATTRIBUTE ([\w-]+$)', r'^STRUCTURE ([\w-]+).*# \[annotations\]', r'^Tokens:\s*(\d+)']
        with open (os.path.join (self.registry, self.name), encoding = 'utf8') as fin:
            for line in fin:
                pattr = re.search (patterns[0], line)
                if pattr:
                    self.pattrs.append (pattr.group (1))
                else:
                    sattr = re.search (patterns[1], line)
                    if sattr:
                        self.sattrs.append (sattr.group (1))
        command = [os.path.join (self.cwb, 'cwb-lexdecode'), '-S', '-r', self.registry, self.id]
        pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
        output = pr.communicate ()[0]
        self.size = int (re.search (patterns[2], output, re.MULTILINE).group (1))
    
    def get_frequency (self, pattrs = []):

        if not pattrs:
            pattrs = self.pattrs
        freq = {pattr: {'cs': defaultdict (int), 'ci': defaultdict (int)} for pattr in pattrs}
        for pattr in pattrs:
            command = [os.path.join (self.cwb, 'cwb-lexdecode'), '-fb', '-r', self.registry, '-P', pattr, self.id]
            pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
            for line in pr.communicate ()[0].splitlines ():
                fr, form = line.strip ().split ('\t')
                freq[pattr]['cs'][form] = int (fr)
                freq[pattr]['ci'][form.lower ()] += int (fr)
        return freq
    
    def get_sattr_values (self, sattrs = []):

        res = {}
        if not sattrs:
            sattrs = self.sattrs

        for sattr in sattrs:
            res[sattr] = set ()
            command = [os.path.join (self.cwb, 'cwb-s-decode'), '-r', self.registry, '-n', self.id, '-S', sattr]
            pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
            for line in pr.communicate ()[0].splitlines ():
                val = line.strip ()
                if val:
                    res[sattr].add (val)

        return res


