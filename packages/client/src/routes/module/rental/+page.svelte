<script lang="ts">
  import {
    Accordion,
    AccordionItem,
    Button,
    ClickableTile,
    Column,
    DataTable,
    Grid,
    InlineNotification,
    Modal,
    Row,
    SkeletonText,
    Tag,
    Toggle,
  } from 'carbon-components-svelte';
  import type { CometError, CometResponse, Goods } from 'mirinae-comet';
  import { groupDisplayName } from '$lib/module/auth';
  import { browser } from '$app/environment';
  import { Add16, Delete16, Edit16, Need16 } from 'carbon-icons-svelte';
  import { userInfo } from '$lib/stores';
  import { isAccessible } from '$lib/module/auth';
  import AddGoodsModal from '../../../lib/components/molcule/module/rental/AddGoodsModal.svelte';
  import UpdateGoodsModal from '../../../lib/components/molcule/module/rental/UpdateGoodsModal.svelte';
  import RentModal from '../../../lib/components/molcule/module/rental/RentModal.svelte';
  import { apiGoodsDelete, apiGoodsQuery, apiGoodsReturn } from '$lib/api/module/rental';

  let allGoodies: Array<Goods> = undefined;

  $: categorizedGoods = (allGoodies ?? [])
    .filter((v) => (rentOnly && v.rentStatus !== undefined) || !rentOnly)
    .reduce(
      (map, obj) => ({
        ...map,
        [obj.category]: (map[obj.category] || []).concat(obj),
      }),
      {},
    );

  if (browser) {
    updateGoods();
  }

  let addGoodsModalOpen = false;
  let updateGoodsModalOpen = false;
  let rentModalOpen = false;
  let deleteModalOpen = false;
  let returnModalOpen = false;
  let targetGoods = undefined;
  let rentOnly = false;

  function openUpdateGoodsModal(row) {
    targetGoods = row;
    updateGoodsModalOpen = true;
  }

  function openDeleteGoodsModal(row) {
    targetGoods = row;
    deleteModalOpen = true;
  }

  function openReturnGoodsModal(row) {
    targetGoods = row;
    returnModalOpen = true;
  }

  function updateGoods() {
    allGoodies = undefined;
    apiGoodsQuery()
      .then((res) => {
        if (res.success === false)
          throw new Error(`Request error ${res.error.name}: ${res.error.message}`);
        if (res.success) allGoodies = res.result as Array<Goods>;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function deleteGoods() {
    deleteModalOpen = false;
    apiGoodsDelete(targetGoods.id)
      .then((res) => {
        if (res.success === false)
          throw new Error(`Request error ${res.error.name}: ${res.error.message}`);
        updateGoods();
      });
  }

  function returnGoods() {
    returnModalOpen = false;
    apiGoodsReturn({
      userId: targetGoods.rentStatus.userId,
      goodsId: targetGoods.id,
    })
      .then((res: CometResponse<{}, CometError>) => {
        if (res.success === false)
          throw new Error(`Request error ${res.error.name}: ${res.error.message}`);
        updateGoods();
      });
  }
</script>

<Grid>
  <Row>
    <Column>
      <h1>대여 현황</h1>
    </Column>
    {#if isAccessible($userInfo, 'executive')}
      <Column style="display: flex; justify-content: end;">
        <Button
          icon={Need16}
          on:click={() => {
            rentModalOpen = true;
          }}
          disabled={!isAccessible($userInfo, 'executive')}>
          대여하기
        </Button>
        <Button
          icon={Add16}
          on:click={() => {
            addGoodsModalOpen = true;
          }}
          kind="secondary"
          disabled={!isAccessible($userInfo, 'executive')}
          >대여 물품 추가
        </Button>
      </Column>
    {/if}
  </Row>
  <Row>
    <Column>
      <Toggle labelText="대여 중인 물품만 보기" labelA="끔" labelB="켬" bind:toggled={rentOnly} />
    </Column>
  </Row>
  <Row style="margin-top: 1rem;">
    <Column>
      {#if allGoodies}
        <div style="display: flex; margin: 1rem 0; flex-wrap: wrap;">
          {#each Object.keys(categorizedGoods) as category}
            <ClickableTile style="margin-right: 0.5rem; margin-bottom: 0.5rem;" href="#{category}">
              {category}
            </ClickableTile>
          {/each}
        </div>
        {#if Object.keys(categorizedGoods).length > 0}
          <Accordion>
            {#each Object.entries(categorizedGoods) as [category, goodies]}
              <AccordionItem id={category}>
                <svelte:fragment slot="title">
                  <h3>{category}</h3>
                  <p>
                    {goodies.length}개 중 {goodies.filter((goods) => goods.rentStatus === undefined)
                      .length}개 대여 가능
                  </p>
                </svelte:fragment>
                <DataTable
                  style="width: 100%;"
                  size="short"
                  expandable
                  nonExpandableRowIds={goodies
                    .filter((row) => row.rentStatus === undefined)
                    .map((row) => row.id)}
                  headers={[
                    { key: 'name', value: '물품명' },
                    { key: 'rentStatus', value: '대여 여부' },
                    { key: 'overflow', empty: true },
                  ]}
                  rows={goodies}>
                  <svelte:fragment slot="cell" let:row let:cell>
                    {#if cell.key === 'rentStatus'}
                      {#if cell.value !== undefined}
                        <Tag type="red">대여 중</Tag>
                        <Tag type="outline"
                          >{cell.value.userName}
                          / {new Date(cell.value.until).toLocaleDateString('ko')}
                          {new Date(cell.value.until).getHours()}
                          시 경 반납 예정
                        </Tag>
                      {:else}
                        <Tag type="green">대여 가능</Tag>
                        <Tag type="outline">{groupDisplayName[row.permission]} 이상</Tag>
                      {/if}
                    {:else if cell.key === 'name'}
                      <p>{cell.value}</p>
                      <p class="bx--form__helper-text">위치: {row.location}</p>
                    {:else if cell.key === 'overflow'}
                      {#if isAccessible($userInfo, 'executive')}
                        <Button
                          iconDescription="수정"
                          kind="ghost"
                          icon={Edit16}
                          on:click={() => openUpdateGoodsModal(row)}
                          disabled={!isAccessible($userInfo, 'executive')} />
                        <Button
                          iconDescription="삭제"
                          kind="ghost"
                          icon={Delete16}
                          on:click={() => openDeleteGoodsModal(row)}
                          disabled={!isAccessible($userInfo, 'executive')} />
                      {/if}
                    {:else}
                      {cell.value}
                    {/if}
                  </svelte:fragment>
                  <svelte:fragment slot="expanded-row" let:row>
                    <Grid>
                      <Row>
                        <Column>
                          <h5>비고</h5>
                          <pre>{row.rentStatus.additionalInfo}</pre>
                        </Column>
                        {#if isAccessible($userInfo, 'executive')}
                          <Column>
                            <Button
                              disabled={!isAccessible($userInfo, 'executive')}
                              on:click={() => openReturnGoodsModal(row)}
                              >반납 처리
                            </Button>
                          </Column>
                        {/if}
                      </Row>
                    </Grid>
                  </svelte:fragment>
                </DataTable>
              </AccordionItem>
            {/each}
          </Accordion>
        {:else if rentOnly}
          <p>대여 중인 물품이 없습니다.</p>
        {:else}
          <p>대여 가능한 물품이 없습니다.</p>
        {/if}
      {:else}
        <SkeletonText paragraph />
      {/if}
    </Column>
  </Row>
</Grid>

<Modal
  danger
  bind:open={deleteModalOpen}
  modalHeading="물품 삭제"
  primaryButtonText="삭제"
  secondaryButtonText="취소"
  on:click:button--secondary={() => (deleteModalOpen = false)}
  on:open
  on:close
  on:submit={() => deleteGoods(targetGoods)}>
  <p>
    {#if targetGoods}
      이 작업은 되돌릴 수 없습니다. <br /> 정말 {targetGoods?.name}물품을 삭제하시겠습니까?
    {:else}
      <InlineNotification
        hideCloseButton
        lowContrast
        kind="error"
        title="오류:"
        subtitle="선택된 물품이 없습니다." />
    {/if}
  </p>
</Modal>
<Modal
  bind:open={returnModalOpen}
  modalHeading="물품 반납"
  primaryButtonText="반납"
  secondaryButtonText="취소"
  on:click:button--secondary={() => (returnModalOpen = false)}
  on:open
  on:close
  on:submit={() => returnGoods(targetGoods)}>
  <p>
    {#if targetGoods}
      물품의 상태를 점검한 후 반납하시기 바랍니다.<br /> 정말 {targetGoods?.name}물품을
      반납하시겠습니까?
    {:else}
      <InlineNotification
        hideCloseButton
        lowContrast
        kind="error"
        title="오류:"
        subtitle="선택된 물품이 없습니다." />
    {/if}
  </p>
</Modal>

<AddGoodsModal bind:open={addGoodsModalOpen} on:success={() => updateGoods()} />
<UpdateGoodsModal bind:open={updateGoodsModalOpen} {targetGoods} on:success={() => updateGoods()} />
<RentModal bind:open={rentModalOpen} goodies={allGoodies} on:success={() => updateGoods()} />
