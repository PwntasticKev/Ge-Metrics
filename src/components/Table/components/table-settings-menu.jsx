import {Menu} from '@mantine/core';
import {IconArrowsLeftRight, IconReceipt, IconSchoolBell, IconSettings} from '@tabler/icons-react';


export default function TableSettingsMenu() {
    return (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <IconSettings/>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Item Settings</Menu.Label>
                <Menu.Item icon={<IconReceipt size={14}/>}>Add Purchase</Menu.Item>
                <Menu.Item icon={<IconSchoolBell size={14}/>}>Setup Alert</Menu.Item>
                <Menu.Divider/>
                {/*<Menu.Label>Danger zone</Menu.Label>*/}
                <Menu.Item icon={<IconArrowsLeftRight size={14}/>}>Tell Your Friends</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    )
}