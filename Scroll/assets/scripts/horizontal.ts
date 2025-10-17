
import { _decorator, Component, Node, Size } from 'cc';
import { BaseItem } from './baseItem';
import { SuperLayout } from '../core/super-layout';
const { ccclass, property } = _decorator;

@ccclass('Horizontal')
export class Horizontal extends BaseItem {
    onLoad() {
        this.input.placeholder = this.transform?.width.toString()!
    }
    onInput() {
        let width = Number(this.input.string)
        if (isNaN(width)) return
        if (width < 100) {
            return
        }
        this.transform?.setContentSize(new Size(Number(this.input.string), this.transform.contentSize.height))
        this.layout.updateItemSize(this.node, this.transform?.contentSize!)
    }
    show(data: any, index: number, callback: Function, layout: SuperLayout) {
        super.show(data, index, callback, layout)
        var time = Math.random() * 2
        // const width = Math.random() * 200 + 100
        var scale = Math.random()
        scale = Math.max(0.5, scale)
        scale = Math.min(2, scale)
        const width = index % 2 == 0 ? 100 : 150
        const size = new Size(width, this.transform?.height)
        // this.unscheduleAllCallbacks()
        // this.scheduleOnce(() => {
        //     this.transform?.setContentSize(size)
        // }, time)
        // this.transform?.setContentSize(size)
        // layout.updateItemSize(this.node, size)
    }
}
