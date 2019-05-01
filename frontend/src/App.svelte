<script>
    import Item from './Item.svelte';
    import { onMount } from 'svelte';

    let items = [];
    let isOpen = false;

    const fetchInitial = async () => {
        const response = await fetch('http://localhost:8000/admin/api/v2beta/pages/?child_of=1&for_explorer=1')
        const data = await response.json()
        items = data.items
    }

    const topLevelItems = () => {
        const x = items.filter(item => item.parent === undefined)
        return x
    }

    onMount(() => {
        // Todo: Remove this hack
        setTimeout(() => {
            const clickEl = document.querySelector('[data-drawer-menu-item]')
            clickEl.addEventListener('click', (e) => {
                e.preventDefault()
                isOpen = !isOpen
            })
        }, 1000)
    })

    $: classes = isOpen ? 'Drawer--open' : ''

    fetchInitial()
</script>

<style>
    .Drawer {
        position: absolute;
        right: 100px;
        left: 100px;
        background-color: #fff;
        padding: 20px;
        z-index: -1000px;
        opacity: 0;
        height: fit-content;
        transition: opacity .4s ease-in-out, transform .4s ease-in-out;
        transform: translateY(-200px);
        will-change: opacity, transform;
    }

    .Drawer--open {
        opacity: 1;
        z-index: 1000;
        transform: translateY(0);
    }
</style>

<div class="Drawer {classes}">
    <div class="Drawer__Container">
        {#each topLevelItems(items) as item}
            <Item {item} />
        {/each}
    </div>
</div>
