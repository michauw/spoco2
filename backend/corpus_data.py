import os
import re
import subprocess as sb
import json
from collections import defaultdict
from pathlib import Path

class CorpusData:

    def __init__ (self, corpus_name, registry_path, cwb_bin_path = '', svalues = False, frequency = False):

        if type (registry_path) == str:
            registry_path = Path (registry_path)
        if type (cwb_bin_path) == str:
            cwb_bin_path = Path (cwb_bin_path)
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
        with open (self.registry / self.name, encoding = 'utf8') as fin:
            for line in fin:
                pattr = re.search (patterns[0], line)
                if pattr:
                    self.pattrs.append (pattr.group (1))
                else:
                    sattr = re.search (patterns[1], line)
                    if sattr:
                        self.sattrs.append (sattr.group (1))
        command = [self.cwb / 'cwb-lexdecode', '-S', '-r', self.registry, self.id]
        pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
        output = pr.communicate ()[0]
        self.size = int (re.search (patterns[2], output, re.MULTILINE).group (1))
    
    def get_frequency (self, pattrs = []):

        if not pattrs:
            pattrs = self.pattrs
        freq = {pattr: {'cs': defaultdict (int), 'ci': defaultdict (int)} for pattr in pattrs}
        for pattr in pattrs:
            command = [self.cwb / 'cwb-lexdecode', '-fb', '-r', self.registry, '-P', pattr, self.id]
            pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
            for line in pr.communicate ()[0].splitlines ():
                try:
                    fr, form = line.strip ().split ('\t')
                except ValueError:
                    continue
                freq[pattr]['cs'][form] = int (fr)
                freq[pattr]['ci'][form.lower ()] += int (fr)
        return freq
    
    def get_sattr_values (self, sattrs = []):

        res = {}
        if not sattrs:
            sattrs = self.sattrs

        for sattr in sattrs:
            res[sattr] = set ()
            command = [self.cwb / 'cwb-s-decode', '-r', self.registry, '-n', self.id, '-S', sattr]
            pr = sb.Popen (command, stdout = sb.PIPE, encoding = 'utf8')
            for line in pr.communicate ()[0].splitlines ():
                val = line.strip ()
                if val:
                    res[sattr].add (val)

        return res
    
    def to_config (self, to_do = ['pattr', 'sattr', 'filters'], include = {}, exclude = {}, filters = {}, indent = 4):

        def get_list (attrs, include, exclude):
            filtered = attrs
            if include:
                filtered = [att for att in filtered if att in include]
            if exclude:
                filtered = [att for att in filtered if att not in exclude]
            return filtered
        
        parts = {}
        if 'pattr' in to_do:
            pattrs = get_list (self.pattrs, include.get ('pattrs', {}), exclude.get ('pattrs', {}))
            pattr_list = []
            for pattr in pattrs:
                pattr_list.append ({'name': pattr, 'type': 'text', 'initValue': '', 'description': f'Attribute {pattr}', 'inResults': False})
            parts['positionalAttributes'] = pattr_list
        if 'sattr' in to_do:
            sattrs = get_list (self.sattrs, include.get ('sattrs', {}), exclude.get ('sattrs', {}))
            sattr_list = []
            for sattr in sattrs:
                sattr_list.append ({'name': sattr, 'description': f'Attribute: {sattr}', 'type': 'text', 'inResults': True})
            parts['structuralAttributes'] = sattr_list
        if 'filters' in to_do:
            group_list = []
            if filters:
                groups = list (filters.keys ())
            else:
                groups = ['main']
            for group in groups:
                if filters:
                    fields = list (filters[group].keys ())
                else:
                    fields = get_list (self.sattrs, include, exclude)
                field_list = []
                for field in fields:
                    if filters:
                        ftype = filters[group][field]
                    else:
                        ftype = 'text'
                    if ftype == 'text':
                        field_list.append ({'name': field, 'description': f'Filter {field}', 'type': 'text'})
                    else:
                        if not self.sattr_values:
                            self.sattr_values = self.get_sattr_values ()
                        option_list = []
                        for value in self.sattr_values[field]:
                            option_list.append ({'label': value, 'value': value})
                        field_list.append ({'name': field, 'description': f'Filter {field}', 'type': ftype, 'options': option_list})
                group_list.append ({'name': group, 'fields': field_list})
            parts['filters'] = group_list
        
        return json.dumps (parts, indent = indent, ensure_ascii = False)
            
        


