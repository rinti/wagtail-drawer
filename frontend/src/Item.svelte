<script>
    let children = [];
    export let item;

    const fetchChildren = async () => {
        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000')
        const response = await fetch(`${url}&for_explorer=1`)

        const data = await response.json()
        children = data.items
    }

    $: hasChildren = item.meta.children && item.meta.children.count > 0;
    $: linkClasses = hasChildren ? 'icon icon-folder-inverse' : 'icon icon-doc-full-inverse';
</script>

<style>
    .Item {
        padding-left: 10px;
    }
    .Item__Link {
        display: block;
        padding: 5px 10px;
        border-bottom: 1px solid #f1f1f1;
    }
</style>

<div class="Item">
    <a href="#" class="Item__Link {linkClasses}" on:click={() => fetchChildren(item)}>
        {item.title}
    </a>
    {#if children.length > 0}
        {#each children as child}
            <svelte:self item={child} />
        {/each}
    {/if}
</div>
