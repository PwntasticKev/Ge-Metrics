import {Button, Menu, Tooltip} from '@mantine/core';
import {IconArrowsLeftRight, IconReceipt, IconSchoolBell, IconSettings} from '@tabler/icons-react';


export default function TableSettingsMenu({itemId}) {
    return (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <Tooltip label="Item Options">
                    <Button variant="subtle" size="sm"><IconSettings size={18}/></Button>
                </Tooltip>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Item Settings | {itemId}</Menu.Label>
                <Menu.Item icon={<IconReceipt size={14}/>}>Add Purchase</Menu.Item>
                <Menu.Item icon={<IconSchoolBell size={14}/>}>Setup Alert</Menu.Item>
                <Menu.Divider/>
                {/*<Menu.Label>Danger zone</Menu.Label>*/}
                <Menu.Item icon={<IconArrowsLeftRight size={14}/>}>Tell Your Friends</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    )
}