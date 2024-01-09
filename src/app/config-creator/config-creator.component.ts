/* 
    Component that faciliates creation of the config file which can get complicated.

*/

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
    selector: 'spoco-config-creator',
    templateUrl: './config-creator.component.html',
    styleUrls: ['./config-creator.component.scss']
})
export class ConfigCreatorComponent implements OnInit {

    constructor(private fb: FormBuilder, private http: HttpClient) { }

    ngOnInit(): void {
        this.addCorpus ();
        this.addPattr ();
        this.addSattr ();
    }

    configForm = this.fb.group ({
        'projectName': ['', {
            updateOn: 'blur'
        }],
        'corpora': this.fb.array ([]),
        'pattrs': this.fb.array ([]),
        'sattrs': this.fb.array ([])
    });

    private sub: Subscription;

    get corpora () {
        return this.configForm.controls['corpora'] as FormArray;
    }

    get pattrs () {
        return this.configForm.controls['pattrs'] as FormArray;
    }

    get sattrs () {
        return this.configForm.controls['sattrs'] as FormArray;
    }


    addCorpus () {
        const corpForm = this.fb.group ({
            'name': [''],
            'id': [''],
            'cwb-corpus': [''],
            'primary': ['']
        });

        this.corpora.push (corpForm);
    }

    addPattr () {
        const pattrForm = this.fb.group ({
            'name': [''],
            'type': [''],
            'initValue': [''],
            'description': [''],
            'inResults': ['']
        });

        this.pattrs.push (pattrForm);
    }

    addSattr () {
        const sattrForm = this.fb.group ({
            'name': [''],
            'type': [''],
            'description': [''],
            'inResults': ['']
        });

        this.sattrs.push (sattrForm);
    }

    createFile () {
        let configObj: any = {};
        configObj['projectName'] = this.configForm.controls['projectName'].value;
        let data = this.configForm.getRawValue ();
        let data2 = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, "\t"));
        // const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        // const blobUrl = window.URL.createObjectURL(blob);

        // console.log (blobUrl);
        // this.sub = this.http.get (blobUrl, { responseType: "blob" }).subscribe (response => {

        // });
        let html = '<a id="down" href="data:' + data2 + '" download="config.json" style="display: none">download JSON</a>';
        let el = document.getElementById ('download');
        if (el !== null){
            el.innerHTML += html;}
        let down = document.getElementById ('down');
        if (down !== null)
             down.click ();
    }

}
