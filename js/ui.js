import * as dat from 'dat.gui';
import { random_state } from './states';

/**
 * @module ui
 */

/**
 * For now UI is handled by each module, so that structures dont need to be passed from each module to the UI module.
 * @function setupUI
 * @returns {dat.GUI} The dat.GUI instance.
*/
export function setupUI(shared_resources, iterate_stage) {
    const gui = new dat.GUI({
        name: 'Cellular Automata'
    });

    gui.width = 200;

    const buttons = {
        new_rule: () => {
            shared_resources.update_ruleset_buffer(random_state(shared_resources.rule_info.k));
            iterate_stage.reset();
        }
    }

    //GUI Settings
    const rule_info_folder = gui.addFolder('Rule Info');
    rule_info_folder.open();
    rule_info_folder.add(shared_resources.rule_info, 'r', 1, 6, 1).name('r (range)').onFinishChange(attempt_rule_info_buffer_update);
    rule_info_folder.add(shared_resources.rule_info, 'k', 2, 6, 1).name('k (states)').onFinishChange(attempt_rule_info_buffer_update);
    rule_info_folder.add(buttons, 'new_rule').name('New Rule');
    

    function attempt_rule_info_buffer_update() {
        if(shared_resources.update_rule_info_buffer()) {
            rule_info_folder.domElement.children[0].style.color = "";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info";
            iterate_stage.reset();
        } else {
            rule_info_folder.domElement.children[0].style.color = "red";
            rule_info_folder.domElement.children[0].children[0].innerText = "Rule Info (Buffer Size Too Large)";
        }
            
    }

    
    


    return gui;
}